"use server";

import { getDb } from "@/db/index";
import {
  applyLatestPendingProposalForPerson,
  listPendingProposalsForPerson,
} from "@/lib/network-repo";

export async function listPendingProposalsAction(personId: string) {
  const db = getDb();
  const rows = await listPendingProposalsForPerson(db, personId);
  return rows.map((r) => ({
    id: r.id,
    personId: r.personId,
    evidenceUrls: JSON.parse(r.evidenceUrlsJson || "[]") as string[],
    createdAt: r.createdAt,
  }));
}

export async function applyLatestProposalAction(personId: string) {
  const db = getDb();
  return applyLatestPendingProposalForPerson(db, personId);
}
