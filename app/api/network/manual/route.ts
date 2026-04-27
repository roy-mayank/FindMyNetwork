import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/index";
import { nodes } from "@/db/schema";
import { applyNetworkPatch } from "@/lib/network-repo";

const baseSchema = z.object({
  label: z.string().min(1, "Name is required"),
  sourceUrl: z.string().url("Source URL must be valid").optional().or(z.literal("")),
  sourceType: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawExtract: z.string().optional(),
});

const companyInputSchema = baseSchema.extend({
  kind: z.literal("company"),
  industry: z.string().min(1, "Industry is required"),
  subtitle: z.string().optional(),
  website: z.string().url("Website must be a valid URL").optional().or(z.literal("")),
  connectToId: z.string().min(1).optional(),
});

const personInputSchema = baseSchema.extend({
  kind: z.literal("person"),
  title: z.string().optional(),
  linkedinUrl: z
    .string()
    .url("LinkedIn URL must be a valid URL")
    .optional()
    .or(z.literal("")),
  alumniUrl: z
    .string()
    .url("Alumni URL must be a valid URL")
    .optional()
    .or(z.literal("")),
  companyId: z.string().min(1, "Choose a company"),
  notes: z.string().optional(),
  lastReachedAt: z.string().optional(),
  lastAttemptAt: z.string().optional(),
});

const manualNodeSchema = z.discriminatedUnion("kind", [
  companyInputSchema,
  personInputSchema,
]);
const manualDeleteSchema = z.object({
  id: z.string().min(1, "Node id is required"),
  kind: z.enum(["company", "person"]),
});

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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = manualNodeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const input = parsed.data;

  try {
    if (input.kind === "company") {
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
      return Response.json({ ok: true, id: nodeId });
    }

    const [company] = await db
      .select({ id: nodes.id })
      .from(nodes)
      .where(eq(nodes.id, input.companyId))
      .limit(1);
    if (!company) {
      return Response.json({ error: "Selected company does not exist" }, { status: 400 });
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
      edges: [{ source: input.companyId, target: nodeId }],
      personProfiles: [
        {
          personId: nodeId,
          notes: trimOrNull(input.notes),
          lastOutreachAt: trimOrNull(input.lastReachedAt),
          lastAttemptAt: trimOrNull(input.lastAttemptAt),
          enrichmentStatus: "none",
        },
      ],
    });
    return Response.json({ ok: true, id: nodeId });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to add node" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = manualDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const { id, kind } = parsed.data;

  try {
    const [row] = await db
      .select({ id: nodes.id, kind: nodes.kind })
      .from(nodes)
      .where(eq(nodes.id, id))
      .limit(1);
    if (!row) {
      return Response.json({ error: "Node not found" }, { status: 404 });
    }
    if (row.kind !== kind) {
      return Response.json({ error: "Node kind mismatch" }, { status: 400 });
    }

    applyNetworkPatch(db, { deleteNodeIds: [id] });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to delete node" },
      { status: 500 },
    );
  }
}
