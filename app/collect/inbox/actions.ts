"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/index";
import { pendingCaptures } from "@/db/schema";
import { createManualNode, manualNodeSchema } from "@/lib/manual-network-create";
import type { ManualNodeInput } from "@/lib/manual-network-create";

export async function dismissCapture(id: string): Promise<{ ok: true } | { error: string }> {
  const db = getDb();
  const result = await db
    .delete(pendingCaptures)
    .where(and(eq(pendingCaptures.id, id), eq(pendingCaptures.status, "pending")))
    .returning({ id: pendingCaptures.id });
  if (result.length === 0) {
    return { error: "Capture not found or already handled." };
  }
  revalidatePath("/collect/inbox");
  revalidatePath("/collect");
  return { ok: true };
}

function mergeSourceFromRow(
  row: { sourceUrl: string; payloadJson: string },
  input: ManualNodeInput,
): ManualNodeInput {
  let payload: { rawExtract?: string; confidence?: number } = {};
  try {
    payload = JSON.parse(row.payloadJson || "{}") as typeof payload;
  } catch {
    /* ignore */
  }
  const rawExtract = input.rawExtract ?? payload.rawExtract;
  const confidence = input.confidence ?? payload.confidence;

  if (input.kind === "company") {
    return {
      ...input,
      sourceUrl: input.sourceUrl?.trim() ? input.sourceUrl : row.sourceUrl,
      sourceType: input.sourceType ?? "browser_extension",
      rawExtract,
      confidence,
    };
  }
  return {
    ...input,
    sourceUrl: input.sourceUrl?.trim() ? input.sourceUrl : row.sourceUrl,
    sourceType: input.sourceType ?? "browser_extension",
    rawExtract,
    confidence,
  };
}

export async function confirmCapture(
  id: string,
  manualJson: string,
): Promise<{ ok: true } | { error: string }> {
  let body: unknown;
  try {
    body = JSON.parse(manualJson);
  } catch {
    return { error: "Invalid JSON." };
  }

  const parsed = manualNodeSchema.safeParse(body);
  if (!parsed.success) {
    return { error: "Validation failed. Check required fields." };
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(pendingCaptures)
    .where(and(eq(pendingCaptures.id, id), eq(pendingCaptures.status, "pending")))
    .limit(1);

  if (!row) {
    return { error: "Capture not found or already handled." };
  }

  const merged = mergeSourceFromRow(row, parsed.data);
  const validated = manualNodeSchema.safeParse(merged);
  if (!validated.success) {
    return { error: "Validation failed after merging source URL." };
  }

  try {
    await createManualNode(db, validated.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save to graph." };
  }

  await db.delete(pendingCaptures).where(eq(pendingCaptures.id, id));
  revalidatePath("/collect/inbox");
  revalidatePath("/collect");
  revalidatePath("/");
  revalidatePath("/graph");
  return { ok: true };
}
