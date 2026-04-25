import type { NextRequest } from "next/server";

import { getDb } from "@/db/index";
import { authorizeMcpRequest } from "@/lib/mcp-auth";
import { networkPatchSchema } from "@/lib/network-patch-schema";
import { applyNetworkPatch } from "@/lib/network-repo";

export async function POST(request: NextRequest) {
  const denied = authorizeMcpRequest(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = networkPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  applyNetworkPatch(db, parsed.data);
  return Response.json({ ok: true });
}
