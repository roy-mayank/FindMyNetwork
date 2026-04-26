"use server";

import { getDb } from "@/db/index";
import {
  applyEnrichmentProposalById,
  applyLatestPendingProposalForPerson,
  listEmailDraftsForPerson,
  listPendingProposalsForPerson,
  rejectEnrichmentProposalById,
  replaceEmailDraftsForPerson,
} from "@/lib/network-repo";
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
