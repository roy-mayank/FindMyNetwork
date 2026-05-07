import { z } from "zod";

export const artifactTypeSchema = z.enum([
  "linkedin_text",
  "linkedin_json",
  "careershift_text",
  "hiring_table_text",
  "apify_dataset",
  "other",
]);

export type EnrichmentArtifactType = z.infer<typeof artifactTypeSchema>;

export const enrichArtifactInputSchema = z.object({
  id: z.string().min(1),
  type: artifactTypeSchema,
  /** Plain text or stringified JSON */
  content: z.string().min(1).max(200_000),
});

export type EnrichArtifactInput = z.infer<typeof enrichArtifactInputSchema>;

export const citationSchema = z.object({
  claim: z.string().min(1),
  artifactId: z.string().min(1),
  excerpt: z.string().min(1).max(2000),
});

export const hiringCitationSchema = z.object({
  artifactId: z.string().min(1),
  excerpt: z.string().min(1).max(2000),
});

const emailOrNull = z.preprocess(
  (v) => (v === "" ? null : v),
  z.union([z.string().email(), z.null()]).optional(),
);

export const enrichmentExtractionSchema = z.object({
  interestingFacts: z.array(z.string().min(1)).max(12).default([]),
  summaryForNotes: z.string().max(8000).optional(),
  suggestedEmail: emailOrNull,
  suggestedSecondaryEmail: emailOrNull,
  hiring: z
    .object({
      /** 0–100 relative score only when numbers were cited from artifacts */
      internationalHiringScore: z.number().min(0).max(100).nullable().optional(),
      optEmployerRank: z.number().int().positive().nullable().optional(),
      optTotalStudents: z.number().int().nonnegative().nullable().optional(),
      h1bApprovalsApprox: z.number().int().nonnegative().nullable().optional(),
      summaryLine: z.string().max(2000).nullable().optional(),
      citations: z.array(hiringCitationSchema).max(20).default([]),
    })
    .optional(),
  citations: z.array(citationSchema).max(40).default([]),
  confidence: z.number().min(0).max(1).optional(),
});

export type EnrichmentExtraction = z.infer<typeof enrichmentExtractionSchema>;

const jsonFence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;

/** Parse model output: raw JSON or fenced ```json``` block. */
export function parseEnrichmentExtractionFromModelText(raw: string): {
  ok: true;
  data: EnrichmentExtraction;
} | {
  ok: false;
  error: string;
} {
  const trimmed = raw.trim();
  let jsonStr = trimmed;
  const fence = jsonFence.exec(trimmed);
  if (fence?.[1]) jsonStr = fence[1].trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr) as unknown;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid JSON from model",
    };
  }
  const result = enrichmentExtractionSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: result.error.flatten().toString() };
  }
  return { ok: true, data: result.data };
}
