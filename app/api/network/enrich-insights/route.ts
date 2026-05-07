import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/index";
import { edges, nodes, personProfile } from "@/db/schema";
import { fetchApifyDatasetItemsByRunId } from "@/lib/connectors/apify";
import { loadEmployerSnapshotRow } from "@/lib/hiring-signals/snapshot-loader";
import { extractEnrichmentFacts } from "@/lib/llm/claude";
import { enrichArtifactInputSchema } from "@/lib/llm/schemas/enrichment-extraction";
import type { NetworkPatchInput } from "@/lib/network-patch-schema";
import { createEnrichmentProposal } from "@/lib/network-repo";

function parsePayloadJson(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || "{}") as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const requestSchema = z
  .object({
    personId: z.string().min(1).optional(),
    companyId: z.string().min(1).optional(),
    artifacts: z.array(enrichArtifactInputSchema).max(20).default([]),
    apifyRunId: z.string().min(1).optional(),
  })
  .refine((d) => Boolean(d.personId) !== Boolean(d.companyId), {
    message: "Provide exactly one of personId or companyId",
  })
  .refine((d) => d.artifacts.length > 0 || Boolean(d.apifyRunId?.trim()), {
    message: "Provide at least one artifact and/or apifyRunId",
    path: ["artifacts"],
  });

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to your environment to run Claude enrichment." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { personId, companyId, artifacts: bodyArtifacts, apifyRunId } = parsed.data;
  const artifacts = [...bodyArtifacts];

  if (apifyRunId) {
    try {
      const items = await fetchApifyDatasetItemsByRunId(apifyRunId);
      const json = JSON.stringify(items);
      artifacts.push({
        id: `apify-${apifyRunId}`,
        type: "apify_dataset",
        content: json.length > 200_000 ? `${json.slice(0, 199_900)}\n…[truncated]` : json,
      });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Apify fetch failed" },
        { status: 502 },
      );
    }
  }

  const db = getDb();

  try {
    if (personId) {
      const [personRow] = await db.select().from(nodes).where(eq(nodes.id, personId)).limit(1);
      if (!personRow || personRow.kind !== "person") {
        return Response.json({ error: "Person not found" }, { status: 404 });
      }
      const [profileRow] = await db
        .select()
        .from(personProfile)
        .where(eq(personProfile.personId, personId))
        .limit(1);

      const employerRows = await db
        .select({ label: nodes.label, kind: nodes.kind })
        .from(edges)
        .innerJoin(nodes, eq(edges.sourceId, nodes.id))
        .where(eq(edges.targetId, personId));
      const employer = employerRows.find((r) => r.kind === "company");
      const companyName = employer?.label;

      if (companyName) {
        const snap = loadEmployerSnapshotRow(companyName);
        if (snap) {
          artifacts.push({
            id: "employer-snapshot",
            type: "hiring_table_text",
            content: JSON.stringify(snap),
          });
        }
      }

      const existingPayload = parsePayloadJson(personRow.payloadJson);
      const existingNotes = profileRow?.notes ?? "";
      const existingEmail = profileRow?.email ?? "";
      const existingSecondary = profileRow?.secondaryEmail ?? "";

      const { data: extraction } = await extractEnrichmentFacts({
        artifacts,
        target: {
          kind: "person",
          personId,
          displayName: personRow.label,
          companyName,
        },
      });

      const iso = new Date().toISOString();
      const factsLine = extraction.interestingFacts.length
        ? extraction.interestingFacts.map((f) => `• ${f}`).join("\n")
        : "(no fact bullets)";
      const llmBlock = `--- LLM enrichment ${iso} (confidence ${extraction.confidence ?? "n/a"}) ---\n${extraction.summaryForNotes ?? ""}\n${factsLine}`;
      const mergedNotes = existingNotes ? `${existingNotes}\n\n${llmBlock}` : llmBlock;

      const prevFun =
        typeof existingPayload.funFacts === "string" ? existingPayload.funFacts.trim() : "";
      const newFun = extraction.interestingFacts.join("\n");
      const funFacts = prevFun ? `${prevFun}\n\n${newFun}` : newFun;

      const patch: NetworkPatchInput = {
        nodes: [
          {
            id: personId,
            kind: "person",
            label: personRow.label,
            payload: {
              funFacts: funFacts.slice(0, 12_000),
              ...(extraction.hiring?.internationalHiringScore != null
                ? { internationalHiringScore: extraction.hiring.internationalHiringScore }
                : {}),
              ...(extraction.hiring?.summaryLine
                ? { hiringSignalsSummary: extraction.hiring.summaryLine }
                : {}),
            },
          },
        ],
        personProfiles: [
          {
            personId,
            notes: mergedNotes,
            enrichmentStatus: "enriched",
            ...(extraction.suggestedEmail && !existingEmail
              ? { email: extraction.suggestedEmail }
              : {}),
            ...(extraction.suggestedSecondaryEmail && !existingSecondary
              ? { secondaryEmail: extraction.suggestedSecondaryEmail }
              : {}),
          },
        ],
      };

      const evidenceUrls = [
        ...artifacts.map((a) => `urn:artifact:${a.id}`),
        ...(apifyRunId ? [`urn:apify:run:${apifyRunId}`] : []),
      ];

      const created = await createEnrichmentProposal(db, {
        personId,
        patch,
        evidenceUrls,
      });
      return Response.json(
        { ok: true, proposalId: created.id, target: "person" as const },
        { status: 201 },
      );
    }

    const cid = companyId!;
    const [companyRow] = await db.select().from(nodes).where(eq(nodes.id, cid)).limit(1);
    if (!companyRow || companyRow.kind !== "company") {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    const snap = loadEmployerSnapshotRow(companyRow.label);
    if (snap) {
      artifacts.push({
        id: "employer-snapshot",
        type: "hiring_table_text",
        content: JSON.stringify(snap),
      });
    }

    const existingPayload = parsePayloadJson(companyRow.payloadJson);
    const prevDesc =
      typeof existingPayload.description === "string" ? existingPayload.description.trim() : "";
    const { data: extraction } = await extractEnrichmentFacts({
      artifacts,
      target: { kind: "company", companyId: cid, displayName: companyRow.label },
    });

    const iso = new Date().toISOString();
    const descAppend = `--- LLM enrichment ${iso} ---\n${extraction.summaryForNotes ?? ""}\n${extraction.interestingFacts.map((f) => `• ${f}`).join("\n")}`;
    const description = prevDesc ? `${prevDesc}\n\n${descAppend}` : descAppend;

    const patch: NetworkPatchInput = {
      nodes: [
        {
          id: cid,
          kind: "company",
          label: companyRow.label,
          payload: {
            description: description.slice(0, 12_000),
            ...(extraction.hiring?.internationalHiringScore != null
              ? { internationalHiringScore: extraction.hiring.internationalHiringScore }
              : {}),
            ...(extraction.hiring?.summaryLine
              ? { hiringSignalsSummary: extraction.hiring.summaryLine }
              : {}),
          },
        },
      ],
    };

    const evidenceUrls = [
      ...artifacts.map((a) => `urn:artifact:${a.id}`),
      ...(apifyRunId ? [`urn:apify:run:${apifyRunId}`] : []),
    ];

      const created = await createEnrichmentProposal(db, {
        personId: undefined,
        patch,
        evidenceUrls,
      });
      return Response.json(
        {
          ok: true,
          proposalId: created.id,
          target: "company" as const,
          hint: "Company proposals are not listed in the person modal; apply this proposalId with POST /api/network/proposals/:id/apply (Bearer) or add company UI later.",
        },
        { status: 201 },
      );
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Enrichment failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
