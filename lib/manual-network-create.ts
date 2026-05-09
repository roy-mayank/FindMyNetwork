import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { z } from "zod";

import * as schema from "@/db/schema";
import { nodes } from "@/db/schema";
import { applyNetworkPatch } from "@/lib/network-repo";
import { DEFAULT_CONNECTION_THROUGH } from "@/lib/network-types";

export const baseManualSchema = z.object({
  label: z.string().min(1, "Name is required"),
  sourceUrl: z.string().url("Source URL must be valid").optional().or(z.literal("")),
  sourceType: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawExtract: z.string().optional(),
});

export const companyInputSchema = baseManualSchema.extend({
  kind: z.literal("company"),
  industry: z.string().min(1, "Industry is required"),
  subtitle: z.string().optional(),
  website: z.string().url("Website must be a valid URL").optional().or(z.literal("")),
  startupStatus: z.enum(["startup", "established"]).optional(),
  purposeLikabilityMatch: z.coerce.number().int().min(1).max(5).optional(),
  description: z.string().optional(),
  connectToId: z.string().min(1).optional(),
});

export const personInputSchema = baseManualSchema.extend({
  kind: z.literal("person"),
  connectionThrough: z.string().min(1).optional(),
  title: z.string().optional(),
  linkedinUrl: z
    .string()
    .url("LinkedIn URL must be a valid URL")
    .optional()
    .or(z.literal("")),
  email: z
    .union([z.literal(""), z.string().email("Email must be a valid address")])
    .optional(),
  alumniUrl: z
    .string()
    .url("Alumni URL must be a valid URL")
    .optional()
    .or(z.literal("")),
  companyId: z.string().min(1, "Choose a company"),
  notes: z.string().optional(),
  lastReachedAt: z.string().optional(),
  lastAttemptAt: z.string().optional(),
  pennGrad: z.boolean().optional(),
});

export const manualNodeSchema = z.discriminatedUnion("kind", [
  companyInputSchema,
  personInputSchema,
]);

export type ManualNodeInput = z.infer<typeof manualNodeSchema>;

const trimOrUndefined = (value?: string) => {
  const v = value?.trim();
  return v ? v : undefined;
};

const trimOrNull = (value?: string) => {
  const v = value?.trim();
  return v ? v : null;
};

function buildNodeId(prefix: "co" | "p" | "ent") {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `${prefix}-${token}`;
}

type Db = BetterSQLite3Database<typeof schema>;

export async function createManualCompany(
  db: Db,
  input: z.infer<typeof companyInputSchema>,
): Promise<{ id: string }> {
  const nodeId = buildNodeId("co");
  const industryLabel = input.industry.trim();
  const [existingIndustry] = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(and(eq(nodes.kind, "entity"), eq(nodes.label, industryLabel)))
    .limit(1);
  const industryId = existingIndustry?.id ?? buildNodeId("ent");
  applyNetworkPatch(db, {
    nodes: [
      ...(existingIndustry
        ? []
        : [
            {
              id: industryId,
              kind: "entity" as const,
              label: industryLabel,
              payload: {},
            },
          ]),
      {
        id: nodeId,
        kind: "company",
        label: input.label.trim(),
        payload: {
          subtitle: trimOrUndefined(input.subtitle),
          website: trimOrUndefined(input.website),
          description: trimOrUndefined(input.description),
          startupStatus: input.startupStatus ?? "established",
          ...(typeof input.purposeLikabilityMatch === "number"
            ? { purposeLikabilityMatch: input.purposeLikabilityMatch }
            : {}),
          sourceUrl: trimOrUndefined(input.sourceUrl),
          sourceType: trimOrUndefined(input.sourceType),
          confidence: input.confidence,
          rawExtract: trimOrUndefined(input.rawExtract),
        },
      },
    ],
    edges: [
      {
        source: input.connectToId ?? "me",
        target: industryId,
      },
      {
        source: industryId,
        target: nodeId,
      },
    ],
    companyProfiles: [
      {
        companyId: nodeId,
        website: trimOrNull(input.website),
      },
    ],
  });
  return { id: nodeId };
}

export async function createManualPerson(
  db: Db,
  input: z.infer<typeof personInputSchema>,
): Promise<{ id: string }> {
  const [company] = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(eq(nodes.id, input.companyId))
    .limit(1);
  if (!company) {
    throw new Error("Selected company does not exist");
  }

  const nodeId = buildNodeId("p");
  applyNetworkPatch(db, {
    nodes: [
      {
        id: nodeId,
        kind: "person",
        label: input.label.trim(),
        payload: {
          title: trimOrUndefined(input.title),
          linkedinUrl: trimOrUndefined(input.linkedinUrl),
          alumniUrl: trimOrUndefined(input.alumniUrl),
          sourceUrl: trimOrUndefined(input.sourceUrl),
          sourceType: trimOrUndefined(input.sourceType),
          confidence: input.confidence,
          rawExtract: trimOrUndefined(input.rawExtract),
        },
      },
    ],
    edges: [
      {
        source: input.companyId,
        target: nodeId,
        connectionThrough:
          trimOrUndefined(input.connectionThrough) ?? DEFAULT_CONNECTION_THROUGH,
      },
    ],
    personProfiles: [
      {
        personId: nodeId,
        notes: trimOrNull(input.notes),
        email: trimOrNull(input.email),
        lastOutreachAt: trimOrNull(input.lastReachedAt),
        lastAttemptAt: trimOrNull(input.lastAttemptAt),
        enrichmentStatus: "none",
        pennGrad: input.pennGrad === true,
      },
    ],
  });
  return { id: nodeId };
}

export async function createManualNode(db: Db, input: ManualNodeInput): Promise<{ id: string }> {
  if (input.kind === "company") {
    return createManualCompany(db, input);
  }
  return createManualPerson(db, input);
}
