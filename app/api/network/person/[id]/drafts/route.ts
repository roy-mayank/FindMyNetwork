import type { NextRequest } from "next/server";

import { getDb } from "@/db/index";
import { authorizeWriteRequest } from "@/lib/api-auth";
import { listEmailDraftsForPerson } from "@/lib/network-repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = authorizeWriteRequest(request);
  if (denied) return denied;
  const { id } = await params;
  const db = getDb();
  const drafts = await listEmailDraftsForPerson(db, id);
  return Response.json({ drafts });
}
