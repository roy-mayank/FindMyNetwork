"use server";

import { eq } from "drizzle-orm";

import { getDb } from "@/db/index";
import { nodes } from "@/db/schema";
import {
  applyEnrichmentProposalById,
  applyLatestPendingProposalForPerson,
  applyNetworkPatch,
  listEmailDraftsForPerson,
  listPendingProposalsForPerson,
  rejectEnrichmentProposalById,
  replaceEmailDraftsForPerson,
} from "@/lib/network-repo";
import type { NetworkPatchInput } from "@/lib/network-patch-schema";
import { buildEmailDraftsForPerson } from "@/lib/outreach-drafts";

export async function listPendingProposalsAction(personId: string) {
  const db = getDb();
  const rows = await listPendingProposalsForPerson(db, personId);
  return rows.map((r) => ({
    id: r.id,
    personId: r.personId,
    patch: JSON.parse(r.patchJson) as unknown,
    evidenceUrls: JSON.parse(r.evidenceUrlsJson || "[]") as string[],
    createdAt: r.createdAt,
  }));
}

export async function applyLatestProposalAction(personId: string) {
  const db = getDb();
  return applyLatestPendingProposalForPerson(db, personId);
}

export async function applyProposalAction(proposalId: string) {
  const db = getDb();
  await applyEnrichmentProposalById(db, proposalId);
  return { ok: true as const };
}

export async function rejectProposalAction(proposalId: string) {
  const db = getDb();
  await rejectEnrichmentProposalById(db, proposalId);
  return { ok: true as const };
}

export async function listEmailDraftsAction(personId: string) {
  const db = getDb();
  return listEmailDraftsForPerson(db, personId);
}

export async function generateEmailDraftsAction(personId: string) {
  const db = getDb();
  const drafts = await buildEmailDraftsForPerson(db, personId);
  await replaceEmailDraftsForPerson(db, personId, drafts);
  return listEmailDraftsForPerson(db, personId);
}

export async function updatePersonReachAction(input: {
  personId: string;
  lastOutreachAt?: string | null;
  lastAttemptAt?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const [row] = await db.select().from(nodes).where(eq(nodes.id, input.personId)).limit(1);
  if (!row || row.kind !== "person") {
    return { ok: false, error: "Person not found" };
  }

  const profile: NonNullable<NetworkPatchInput["personProfiles"]>[number] = {
    personId: input.personId,
  };
  if (input.lastOutreachAt !== undefined) {
    profile.lastOutreachAt = input.lastOutreachAt;
  }
  if (input.lastAttemptAt !== undefined) {
    profile.lastAttemptAt = input.lastAttemptAt;
  }

  if (
    input.lastOutreachAt === undefined &&
    input.lastAttemptAt === undefined
  ) {
    return { ok: false, error: "No fields to update" };
  }

  const patch: NetworkPatchInput = { personProfiles: [profile] };
  applyNetworkPatch(db, patch);
  return { ok: true };
}
