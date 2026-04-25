import type { NextRequest } from "next/server";

import { getDb } from "@/db/index";
import { authorizeMcpRequest } from "@/lib/mcp-auth";
import { enrichmentProposalCreateSchema } from "@/lib/network-patch-schema";
import { createEnrichmentProposal, listPendingProposalsForPerson } from "@/lib/network-repo";

export async function GET(request: NextRequest) {
  const denied = authorizeMcpRequest(request);
  if (denied) return denied;

  const personId = request.nextUrl.searchParams.get("personId");
  if (!personId) {
    return Response.json({ error: "personId query parameter is required" }, { status: 400 });
  }

  const db = getDb();
  const rows = await listPendingProposalsForPerson(db, personId);
  return Response.json({
    proposals: rows.map((r) => ({
      id: r.id,
      personId: r.personId,
      patch: JSON.parse(r.patchJson) as unknown,
      evidenceUrls: JSON.parse(r.evidenceUrlsJson || "[]") as string[],
      status: r.status,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const denied = authorizeMcpRequest(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = enrichmentProposalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const created = await createEnrichmentProposal(db, {
    personId: parsed.data.personId,
    patch: parsed.data.patch,
    evidenceUrls: parsed.data.evidenceUrls ?? [],
  });
  return Response.json(created, { status: 201 });
}
