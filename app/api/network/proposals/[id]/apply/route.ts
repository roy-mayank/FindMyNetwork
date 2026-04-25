import type { NextRequest } from "next/server";

import { getDb } from "@/db/index";
import { authorizeMcpRequest } from "@/lib/mcp-auth";
import { applyEnrichmentProposalById } from "@/lib/network-repo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = authorizeMcpRequest(request);
  if (denied) return denied;

  const { id } = await params;
  const db = getDb();
  try {
    await applyEnrichmentProposalById(db, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Apply failed";
    return Response.json({ error: message }, { status: 400 });
  }
  return Response.json({ ok: true });
}
