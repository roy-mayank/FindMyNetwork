import Anthropic from "@anthropic-ai/sdk";

import {
  parseEnrichmentExtractionFromModelText,
  type EnrichArtifactInput,
  type EnrichmentExtraction,
} from "@/lib/llm/schemas/enrichment-extraction";

export type EnrichmentTarget =
  | { kind: "person"; personId: string; displayName: string; companyName?: string }
  | { kind: "company"; companyId: string; displayName: string };

function buildUserPrompt(artifacts: EnrichArtifactInput[], target: EnrichmentTarget): string {
  const lines = artifacts.map(
    (a) =>
      `--- ARTIFACT id=${a.id} type=${a.type} ---\n${a.content}\n--- END ${a.id} ---`,
  );
  const targetLine =
    target.kind === "person"
      ? `Target: PERSON id=${target.personId} name=${JSON.stringify(target.displayName)}` +
        (target.companyName ? ` associated employer=${JSON.stringify(target.companyName)}` : "")
      : `Target: COMPANY id=${target.companyId} name=${JSON.stringify(target.displayName)}`;

  return `${targetLine}

You extract structured facts for a private CRM. Rules:
- Only assert facts that are explicitly supported by the artifact text (or structured JSON values inside artifacts). If unsure, omit.
- For hiring / OPT / H-1B numbers, every numeric field in "hiring" must have at least one matching entry in hiring.citations with the same artifactId and a short excerpt showing that number in context.
- interestingFacts: short bullets (no PII beyond what is already in artifacts).
- summaryForNotes: prose safe to append to CRM notes (no markdown headings).
- suggestedEmail / suggestedSecondaryEmail: only if clearly present for this person in artifacts; else null or omit.
- internationalHiringScore: only if you can justify from cited hiring data in artifacts, 0–100 subjective "intl hiring friendliness" from those numbers; otherwise null/omit.
- confidence: your confidence in the extraction overall (0–1).

Return a single JSON object (no markdown outside JSON) with keys:
interestingFacts (array of strings),
summaryForNotes (string, optional),
suggestedEmail (string|null, optional),
suggestedSecondaryEmail (string|null, optional),
hiring (optional object with internationalHiringScore, optEmployerRank, optTotalStudents, h1bApprovalsApprox, summaryLine, citations),
citations (array of { claim, artifactId, excerpt }),
confidence (number, optional)

Artifacts:

${lines.join("\n\n")}
`;
}

export async function extractEnrichmentFacts(params: {
  artifacts: EnrichArtifactInput[];
  target: EnrichmentTarget;
}): Promise<{ data: EnrichmentExtraction; rawText: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-latest";

  const client = new Anthropic({ apiKey });
  const userContent = buildUserPrompt(params.artifacts, params.target);

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const blocks = response.content;
  const textBlock = blocks.find((b) => b.type === "text" && "text" in b) as
    | { type: "text"; text: string }
    | undefined;
  const rawText = textBlock?.text?.trim() ?? "";
  if (!rawText) {
    throw new Error("Empty response from Claude");
  }

  const parsed = parseEnrichmentExtractionFromModelText(rawText);
  if (!parsed.ok) {
    throw new Error(`Failed to parse Claude JSON: ${parsed.error}`);
  }
  return { data: parsed.data, rawText };
}
