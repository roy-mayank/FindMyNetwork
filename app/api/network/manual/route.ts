import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/index";
import { nodes } from "@/db/schema";
import { applyNetworkPatch } from "@/lib/network-repo";
import { createManualNode, manualNodeSchema } from "@/lib/manual-network-create";

const manualDeleteSchema = z.object({
  id: z.string().min(1, "Node id is required"),
  kind: z.enum(["company", "person"]),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = manualNodeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  try {
    const { id } = await createManualNode(db, parsed.data);
    return Response.json({ ok: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add node";
    if (message === "Selected company does not exist") {
      return Response.json({ error: message }, { status: 400 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = manualDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const { id, kind } = parsed.data;

  try {
    const [row] = await db
      .select({ id: nodes.id, kind: nodes.kind })
      .from(nodes)
      .where(eq(nodes.id, id))
      .limit(1);
    if (!row) {
      return Response.json({ error: "Node not found" }, { status: 404 });
    }
    if (row.kind !== kind) {
      return Response.json({ error: "Node kind mismatch" }, { status: 400 });
    }

    applyNetworkPatch(db, { deleteNodeIds: [id] });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to delete node" },
      { status: 500 },
    );
  }
}
