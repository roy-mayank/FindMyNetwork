import type { NextRequest } from "next/server";
import { eq, or } from "drizzle-orm";

import { getDb } from "@/db/index";
import { edges, nodes } from "@/db/schema";
import { authorizeMcpRequest } from "@/lib/mcp-auth";
import { loadNetworkData } from "@/lib/network-repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = authorizeMcpRequest(request);
  if (denied) return denied;

  const { id: personId } = await params;
  const db = getDb();

  const [person] = await db.select().from(nodes).where(eq(nodes.id, personId)).limit(1);
  if (!person || person.kind !== "person") {
    return Response.json({ error: "Person not found" }, { status: 404 });
  }

  const relatedEdges = await db
    .select()
    .from(edges)
    .where(or(eq(edges.sourceId, personId), eq(edges.targetId, personId)));

  const neighborIds = new Set<string>();
  for (const e of relatedEdges) {
    if (e.sourceId !== personId) neighborIds.add(e.sourceId);
    if (e.targetId !== personId) neighborIds.add(e.targetId);
  }

  const full = await loadNetworkData(db);
  const keep = new Set([personId, ...neighborIds]);
  const subgraphNodes = full.nodes.filter((n) => keep.has(n.id));
  const subgraphEdges = full.edges.filter(
    (e) => keep.has(e.source) && keep.has(e.target),
  );

  return Response.json({
    personId,
    nodes: subgraphNodes,
    edges: subgraphEdges,
  });
}
