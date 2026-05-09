import type { NextRequest } from "next/server";

import { getDb } from "@/db/index";
import { pendingCaptures } from "@/db/schema";
import { authorizeWriteRequest } from "@/lib/api-auth";
import { captureIngestSchema } from "@/lib/pending-capture-ingest";

function newCaptureId() {
  return `cap-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function POST(request: NextRequest) {
  const denied = authorizeWriteRequest(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = captureIngestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
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
    return Response.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to save capture" },
      { status: 500 },
    );
  }
}
