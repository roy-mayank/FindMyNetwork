import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/index";
import { edges, nodes } from "@/db/schema";
import { applyNetworkPatch } from "@/lib/network-repo";
import { DEFAULT_CONNECTION_THROUGH } from "@/lib/network-types";

const optionalUrl = z.string().url().optional().or(z.literal(""));

const personUpdateSchema = z.object({
  personId: z.string().min(1),
  label: z.string().min(1),
  title: z.string().optional().or(z.literal("")),
  linkedinUrl: optionalUrl,
  companyId: z.string().min(1),
  notes: z.string().optional().or(z.literal("")),
  funFacts: z.string().optional().or(z.literal("")),
  confidence: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(1).optional(),
  ),
  lastOutreachScore: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(10).optional(),
  ),
  lastOutreachAt: z.string().optional().or(z.literal("")),
  lastAttemptAt: z.string().optional().or(z.literal("")),
  connectionThrough: z.string().optional().or(z.literal("")),
});

const trimOrUndefined = (value?: string) => {
  const v = value?.trim();
  return v ? v : undefined;
};

const trimOrNull = (value?: string) => {
  const v = value?.trim();
  return v ? v : null;
};

function payloadFunFacts(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const t = value.trim();
  return t === "" ? null : t;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = personUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const db = getDb();

  try {
    const [personRow] = await db
      .select()
      .from(nodes)
      .where(eq(nodes.id, input.personId))
      .limit(1);
    if (!personRow || personRow.kind !== "person") {
      return Response.json({ error: "Person not found" }, { status: 404 });
    }

    const [newCompany] = await db
      .select()
      .from(nodes)
      .where(eq(nodes.id, input.companyId))
      .limit(1);
    if (!newCompany || newCompany.kind !== "company") {
      return Response.json({ error: "Selected company does not exist" }, { status: 400 });
    }

    const incoming = await db
      .select()
      .from(edges)
      .where(eq(edges.targetId, input.personId));

    let oldCompanyEdgeId: string | undefined;
    let oldCompanyId: string | undefined;
    let preservedConnection = DEFAULT_CONNECTION_THROUGH;
    for (const e of incoming) {
      const [src] = await db.select().from(nodes).where(eq(nodes.id, e.sourceId)).limit(1);
      if (src?.kind === "company") {
        oldCompanyEdgeId = e.id;
        oldCompanyId = src.id;
        preservedConnection = e.connectionThrough ?? DEFAULT_CONNECTION_THROUGH;
        break;
      }
    }

    const companyChanged = oldCompanyId !== input.companyId;
    const deleteEdgeIds =
      companyChanged && oldCompanyEdgeId ? [oldCompanyEdgeId] : undefined;

    const trimmedConn = input.connectionThrough?.trim() ?? "";
    const connectionThrough =
      trimmedConn !== "" ? trimmedConn : preservedConnection;

    const funFactsPayload = payloadFunFacts(input.funFacts);

    applyNetworkPatch(db, {
      nodes: [
        {
          id: input.personId,
          kind: "person",
          label: input.label.trim(),
          payload: {
            title: trimOrUndefined(input.title),
            linkedinUrl: trimOrUndefined(input.linkedinUrl),
            ...(input.funFacts !== undefined ? { funFacts: funFactsPayload } : {}),
            ...(typeof input.confidence === "number" ? { confidence: input.confidence } : {}),
            ...(typeof input.lastOutreachScore === "number"
              ? { lastOutreachScore: input.lastOutreachScore }
              : {}),
          },
        },
      ],
      personProfiles: [
        {
          personId: input.personId,
          ...(input.notes !== undefined ? { notes: trimOrNull(input.notes) } : {}),
          ...(input.lastOutreachAt !== undefined
            ? { lastOutreachAt: trimOrNull(input.lastOutreachAt) }
            : {}),
          ...(input.lastAttemptAt !== undefined
            ? { lastAttemptAt: trimOrNull(input.lastAttemptAt) }
            : {}),
        },
      ],
      deleteEdgeIds,
      edges: [
        {
          source: input.companyId,
          target: input.personId,
          connectionThrough,
        },
      ],
    });

    return Response.json({ ok: true, id: input.personId });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to update person" },
      { status: 500 },
    );
  }
}
