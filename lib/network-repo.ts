import { and, desc, eq, inArray } from "drizzle-orm";

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import {
  companyProfile,
  edges,
  enrichmentProposals,
  fundingRounds,
  nodes,
  personProfile,
} from "@/db/schema";
import type { NetworkData, NetworkEdge, NetworkNode } from "@/lib/network-types";
import type { NetworkPatchInput } from "@/lib/network-patch-schema";
import type * as schema from "@/db/schema";

export type AppDb = BetterSQLite3Database<typeof schema>;

type Db = AppDb;

function parsePayload(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || "{}") as unknown;
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function mergePayloadJson(existing: string, partial: Record<string, unknown> | undefined) {
  if (!partial || Object.keys(partial).length === 0) return existing || "{}";
  const base = parsePayload(existing);
  return JSON.stringify({ ...base, ...partial });
}

function fundingSummaryForStages(
  rounds: { stage: string; announcedAt: string | null; amountUsd: string | null }[],
): string | undefined {
  if (rounds.length === 0) return undefined;
  const wanted = new Set(["series_a", "series_b"]);
  const hits = rounds.filter((r) => wanted.has(r.stage));
  if (hits.length === 0) {
    const labels = rounds.map((r) => r.stage.replace(/_/g, " "));
    return labels.slice(0, 3).join(", ");
  }
  return hits
    .map((r) => {
      const label = r.stage.replace(/_/g, " ");
      const when = r.announcedAt ? ` (${r.announcedAt})` : "";
      const amt = r.amountUsd ? ` — $${r.amountUsd}` : "";
      return `${label}${when}${amt}`;
    })
    .join("; ");
}

function rowToNetworkNode(
  row: typeof nodes.$inferSelect,
  extras: {
    company?: typeof companyProfile.$inferSelect | undefined;
    funding?: typeof fundingRounds.$inferSelect[] | undefined;
    person?: typeof personProfile.$inferSelect | undefined;
  },
): NetworkNode {
  const payload = parsePayload(row.payloadJson);
  const subtitle =
    typeof payload.subtitle === "string" ? payload.subtitle : undefined;

  if (row.kind === "me") {
    return { id: row.id, kind: "me", label: row.label };
  }
  if (row.kind === "entity") {
    return { id: row.id, kind: "entity", label: row.label, subtitle };
  }
  if (row.kind === "company") {
    const website =
      extras.company?.website ??
      (typeof payload.website === "string" ? payload.website : undefined);
    const fundingSummary =
      typeof payload.fundingSummary === "string"
        ? payload.fundingSummary
        : fundingSummaryForStages(extras.funding ?? []);
    return {
      id: row.id,
      kind: "company",
      label: row.label,
      subtitle,
      website: website ?? undefined,
      fundingSummary,
    };
  }
  const title = typeof payload.title === "string" ? payload.title : undefined;
  const linkedinUrl =
    typeof payload.linkedinUrl === "string" ? payload.linkedinUrl : undefined;
  const alumniUrl =
    typeof payload.alumniUrl === "string" ? payload.alumniUrl : undefined;
  return {
    id: row.id,
    kind: "person",
    label: row.label,
    title,
    linkedinUrl,
    alumniUrl,
    notes: extras.person?.notes ?? undefined,
    lastOutreachAt: extras.person?.lastOutreachAt ?? undefined,
    enrichmentStatus: extras.person?.enrichmentStatus ?? undefined,
  };
}

export async function loadNetworkData(db: Db): Promise<NetworkData> {
  const nodeRows = await db.select().from(nodes);
  const edgeRows = await db.select().from(edges);
  const companies = await db.select().from(companyProfile);
  const people = await db.select().from(personProfile);
  const allFunding = await db.select().from(fundingRounds);

  const companyById = new Map(companies.map((c) => [c.companyId, c]));
  const personById = new Map(people.map((p) => [p.personId, p]));
  const fundingByCompany = new Map<string, typeof fundingRounds.$inferSelect[]>();
  for (const fr of allFunding) {
    const list = fundingByCompany.get(fr.companyId) ?? [];
    list.push(fr);
    fundingByCompany.set(fr.companyId, list);
  }

  const networkNodes: NetworkNode[] = nodeRows.map((row) =>
    rowToNetworkNode(row, {
      company: row.kind === "company" ? companyById.get(row.id) : undefined,
      funding: row.kind === "company" ? fundingByCompany.get(row.id) : undefined,
      person: row.kind === "person" ? personById.get(row.id) : undefined,
    }),
  );

  const networkEdges: NetworkEdge[] = edgeRows.map((e) => ({
    source: e.sourceId,
    target: e.targetId,
  }));

  return { nodes: networkNodes, edges: networkEdges };
}

function stableEdgeId(source: string, target: string) {
  return `e-${source}-${target}`;
}

/** better-sqlite3 + Drizzle use a synchronous transaction callback (no async / await inside). */
export function applyNetworkPatch(db: Db, patch: NetworkPatchInput): void {
  db.transaction((tx) => {
    if (patch.deleteEdgeIds?.length) {
      tx.delete(edges).where(inArray(edges.id, patch.deleteEdgeIds)).run();
    }
    if (patch.deleteNodeIds?.length) {
      tx.delete(nodes).where(inArray(nodes.id, patch.deleteNodeIds)).run();
    }

    if (patch.nodes?.length) {
      for (const n of patch.nodes) {
        const existing = tx
          .select()
          .from(nodes)
          .where(eq(nodes.id, n.id))
          .limit(1)
          .all()[0];
        const payloadJson = existing
          ? mergePayloadJson(existing.payloadJson, n.payload)
          : mergePayloadJson("{}", n.payload);
        tx.insert(nodes)
          .values({
            id: n.id,
            kind: n.kind,
            label: n.label,
            payloadJson,
          })
          .onConflictDoUpdate({
            target: nodes.id,
            set: {
              kind: n.kind,
              label: n.label,
              payloadJson,
            },
          })
          .run();
      }
    }

    if (patch.edges?.length) {
      for (const e of patch.edges) {
        const id = e.id ?? stableEdgeId(e.source, e.target);
        tx.insert(edges)
          .values({ id, sourceId: e.source, targetId: e.target })
          .onConflictDoUpdate({
            target: [edges.sourceId, edges.targetId],
            set: { id },
          })
          .run();
      }
    }

    if (patch.companyProfiles?.length) {
      for (const c of patch.companyProfiles) {
        tx.insert(companyProfile)
          .values({
            companyId: c.companyId,
            website: c.website ?? null,
            crunchbaseSlug: c.crunchbaseSlug ?? null,
            employeeCountBand: c.employeeCountBand ?? null,
          })
          .onConflictDoUpdate({
            target: companyProfile.companyId,
            set: {
              website: c.website ?? null,
              crunchbaseSlug: c.crunchbaseSlug ?? null,
              employeeCountBand: c.employeeCountBand ?? null,
            },
          })
          .run();
      }
    }

    if (patch.fundingRounds?.length) {
      for (const fr of patch.fundingRounds) {
        tx.insert(fundingRounds)
          .values({
            id: fr.id,
            companyId: fr.companyId,
            stage: fr.stage,
            announcedAt: fr.announcedAt ?? null,
            amountUsd: fr.amountUsd ?? null,
            source: fr.source ?? "manual",
            evidenceUrlsJson: JSON.stringify(fr.evidenceUrls ?? []),
            rawPayloadJson: fr.rawPayload ? JSON.stringify(fr.rawPayload) : null,
          })
          .onConflictDoUpdate({
            target: fundingRounds.id,
            set: {
              companyId: fr.companyId,
              stage: fr.stage,
              announcedAt: fr.announcedAt ?? null,
              amountUsd: fr.amountUsd ?? null,
              source: fr.source ?? "manual",
              evidenceUrlsJson: JSON.stringify(fr.evidenceUrls ?? []),
              rawPayloadJson: fr.rawPayload ? JSON.stringify(fr.rawPayload) : null,
            },
          })
          .run();
      }
    }

    if (patch.personProfiles?.length) {
      for (const p of patch.personProfiles) {
        const existing = tx
          .select()
          .from(personProfile)
          .where(eq(personProfile.personId, p.personId))
          .limit(1)
          .all()[0];
        const notes = p.notes !== undefined ? p.notes : (existing?.notes ?? null);
        const lastOutreachAt =
          p.lastOutreachAt !== undefined
            ? p.lastOutreachAt
            : (existing?.lastOutreachAt ?? null);
        const enrichmentStatus =
          p.enrichmentStatus !== undefined
            ? p.enrichmentStatus
            : (existing?.enrichmentStatus ?? "none");
        tx.insert(personProfile)
          .values({
            personId: p.personId,
            notes,
            lastOutreachAt,
            enrichmentStatus,
          })
          .onConflictDoUpdate({
            target: personProfile.personId,
            set: { notes, lastOutreachAt, enrichmentStatus },
          })
          .run();
      }
    }
  });
}

export async function createEnrichmentProposal(
  db: Db,
  input: {
    personId?: string;
    patch: NetworkPatchInput;
    evidenceUrls: string[];
  },
) {
  const id = crypto.randomUUID();
  await db.insert(enrichmentProposals).values({
    id,
    personId: input.personId ?? null,
    patchJson: JSON.stringify(input.patch),
    evidenceUrlsJson: JSON.stringify(input.evidenceUrls),
    status: "pending",
  });
  return { id };
}

export async function listPendingProposalsForPerson(db: Db, personId: string) {
  return db
    .select()
    .from(enrichmentProposals)
    .where(
      and(
        eq(enrichmentProposals.personId, personId),
        eq(enrichmentProposals.status, "pending"),
      ),
    )
    .orderBy(desc(enrichmentProposals.createdAt));
}

export async function applyEnrichmentProposalById(db: Db, proposalId: string) {
  const [row] = await db
    .select()
    .from(enrichmentProposals)
    .where(eq(enrichmentProposals.id, proposalId))
    .limit(1);
  if (!row) throw new Error("Proposal not found");
  if (row.status !== "pending") throw new Error("Proposal is not pending");

  const patch = JSON.parse(row.patchJson) as NetworkPatchInput;
  applyNetworkPatch(db, patch);
  await db
    .update(enrichmentProposals)
    .set({ status: "applied" })
    .where(eq(enrichmentProposals.id, proposalId));
}

export async function applyLatestPendingProposalForPerson(db: Db, personId: string) {
  const pending = await listPendingProposalsForPerson(db, personId);
  const latest = pending[0];
  if (!latest) return { applied: false as const };
  await applyEnrichmentProposalById(db, latest.id);
  return { applied: true as const, proposalId: latest.id };
}
