import { z } from "zod";

export const nodeKindSchema = z.enum(["me", "entity", "company", "person"]);

export const fundingStageSchema = z.enum([
  "pre_seed",
  "seed",
  "series_a",
  "series_b",
  "series_c",
  "series_d_plus",
  "other",
]);

export const fundingSourceSchema = z.enum(["manual", "agent", "api"]);

export const enrichmentStatusSchema = z.enum([
  "none",
  "pending",
  "enriched",
  "error",
]);

export const verificationStatusSchema = z.enum([
  "unverified",
  "verified",
  "bounced",
  "unknown",
]);

export const proposalStatusSchema = z.enum(["pending", "applied", "rejected"]);

const payloadRecord = z.record(z.string(), z.any());

export const networkPatchNodeSchema = z.object({
  id: z.string().min(1),
  kind: nodeKindSchema,
  label: z.string().min(1),
  /** Shallow-merged into stored `payload_json` (subtitle, title, urls, etc.) */
  payload: payloadRecord.optional(),
});

export const networkPatchEdgeSchema = z.object({
  id: z.string().min(1).optional(),
  source: z.string().min(1),
  target: z.string().min(1),
});

export const companyProfilePatchSchema = z.object({
  companyId: z.string().min(1),
  website: z.string().nullable().optional(),
  crunchbaseSlug: z.string().nullable().optional(),
  employeeCountBand: z.string().nullable().optional(),
});

export const fundingRoundPatchSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  stage: fundingStageSchema,
  announcedAt: z.string().nullable().optional(),
  amountUsd: z.string().nullable().optional(),
  source: fundingSourceSchema.optional(),
  evidenceUrls: z.array(z.string()).optional(),
  rawPayload: z.record(z.string(), z.any()).optional(),
});

export const personProfilePatchSchema = z.object({
  personId: z.string().min(1),
  notes: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  secondaryEmail: z.string().nullable().optional(),
  directoryProfileUrl: z.string().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
  lastAttemptAt: z.string().nullable().optional(),
  lastOutreachAt: z.string().nullable().optional(),
  enrichmentStatus: enrichmentStatusSchema.optional(),
});

export const networkPatchSchema = z.object({
  nodes: z.array(networkPatchNodeSchema).optional(),
  edges: z.array(networkPatchEdgeSchema).optional(),
  deleteNodeIds: z.array(z.string()).optional(),
  deleteEdgeIds: z.array(z.string()).optional(),
  companyProfiles: z.array(companyProfilePatchSchema).optional(),
  fundingRounds: z.array(fundingRoundPatchSchema).optional(),
  personProfiles: z.array(personProfilePatchSchema).optional(),
});

export type NetworkPatchInput = z.infer<typeof networkPatchSchema>;

export const enrichmentProposalCreateSchema = z.object({
  personId: z.string().min(1).optional(),
  patch: networkPatchSchema,
  evidenceUrls: z.array(z.string()).optional().default([]),
});
