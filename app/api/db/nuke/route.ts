import { z } from "zod";

import { nukeSqliteDatabaseAndMigrate } from "@/db/index";

const bodySchema = z.object({
  mongoliaCapital: z.string(),
});

function mongoliaCapitalOk(raw: string): boolean {
  const compact = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "");
  return compact === "ulaanbaatar" || compact === "ulanbator";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!mongoliaCapitalOk(parsed.data.mongoliaCapital)) {
    return Response.json({ error: "Incorrect answer to the verification question." }, { status: 400 });
  }

  try {
    nukeSqliteDatabaseAndMigrate();
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to reset database";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
