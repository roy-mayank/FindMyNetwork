import type { NextRequest } from "next/server";

import { getDb } from "@/db/index";
import { pendingCaptures } from "@/db/schema";
import { authorizeWriteRequest } from "@/lib/api-auth";
import { captureIngestSchema } from "@/lib/pending-capture-ingest";

const captureCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Private-Network": "true",
};

function newCaptureId() {
  return `cap-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: captureCorsHeaders });
}

export async function POST(request: NextRequest) {
  const denied = authorizeWriteRequest(request);
  if (denied) {
    for (const [key, value] of Object.entries(captureCorsHeaders)) {
      denied.headers.set(key, value);
    }
    return denied;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: captureCorsHeaders });
  }

  const parsed = captureIngestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400, headers: captureCorsHeaders });
  }

  const { sourceUrl, pageKind, suggestedKind, payload } = parsed.data;
  const id = newCaptureId();
  const db = getDb();

  try {
    await db.insert(pendingCaptures).values({
      id,
      status: "pending",
      sourceUrl,
      pageKind,
      suggestedKind,
      payloadJson: JSON.stringify(payload),
    });
    return Response.json({ ok: true, id }, { headers: captureCorsHeaders });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to save capture" },
      { status: 500, headers: captureCorsHeaders },
    );
  }
}
