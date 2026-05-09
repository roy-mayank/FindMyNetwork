import { z } from "zod";

export const capturePayloadSchema = z.object({
  label: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  title: z.string().optional(),
  rawExtract: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  suggestedCompanyLabel: z.string().optional(),
});

export type CapturePayload = z.infer<typeof capturePayloadSchema>;

export const captureIngestSchema = z.object({
  sourceUrl: z.string().url(),
  pageKind: z.enum(["yc_company", "yc_jobs", "generic"]),
  suggestedKind: z.enum(["company", "person", "unknown"]),
  payload: capturePayloadSchema.default({}),
});

export type CaptureIngestInput = z.infer<typeof captureIngestSchema>;
