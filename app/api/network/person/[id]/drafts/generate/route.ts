import type { NextRequest } from "next/server";

import { getDb } from "@/db/index";
import { authorizeWriteRequest } from "@/lib/api-auth";
import { buildEmailDraftsForPerson } from "@/lib/outreach-drafts";
import { listEmailDraftsForPerson, replaceEmailDraftsForPerson } from "@/lib/network-repo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = authorizeWriteRequest(request);
  if (denied) return denied;
  const { id } = await params;
  const db = getDb();
  const drafts = await buildEmailDraftsForPerson(db, id);
  await replaceEmailDraftsForPerson(db, id, drafts);
  const rows = await listEmailDraftsForPerson(db, id);
  return Response.json({ drafts: rows });
}
