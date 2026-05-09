import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { CollectInboxClient } from "@/components/collect/CollectInboxClient";
import { JoyShell, joyTitleClassName } from "@/components/layout/JoyShell";
import { getDb } from "@/db/index";
import { pendingCaptures } from "@/db/schema";
import { capturePayloadSchema } from "@/lib/pending-capture-ingest";

export const dynamic = "force-dynamic";

export default async function CollectInboxPage() {
  const db = getDb();
  const rows = await db
    .select()
    .from(pendingCaptures)
    .where(eq(pendingCaptures.status, "pending"))
    .orderBy(desc(pendingCaptures.createdAt));

  const initialCaptures = rows.map((r) => {
    let raw: unknown = {};
    try {
      raw = JSON.parse(r.payloadJson || "{}");
    } catch {
      raw = {};
    }
    const parsed = capturePayloadSchema.safeParse(raw);
    return {
      id: r.id,
      createdAt: r.createdAt,
      sourceUrl: r.sourceUrl,
      pageKind: r.pageKind,
      suggestedKind: r.suggestedKind,
      payload: parsed.success ? parsed.data : {},
    };
  });

  return (
    <JoyShell
      eyebrow="Low energy, high intent"
      title={<h1 className={joyTitleClassName()}>Capture inbox</h1>}
      description={
        <>
          Review saves from the extension, fix anything that looks off, then confirm to add them to
          your graph.
        </>
      }
      actions={
        <>
          <Link
            href="/collect"
            className="rounded-full border-2 border-violet-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-violet-800 shadow-sm transition hover:border-violet-400 hover:bg-white dark:border-violet-500/40 dark:bg-zinc-900/80 dark:text-violet-100 dark:hover:border-amber-400/60 dark:hover:bg-zinc-900"
          >
            Data collection
          </Link>
          <Link
            href="/"
            className="rounded-full border-2 border-sky-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm transition hover:border-sky-400 dark:border-sky-600/40 dark:bg-zinc-900/80 dark:text-sky-100"
          >
            Home
          </Link>
        </>
      }
    >
      <CollectInboxClient initialCaptures={initialCaptures} />
    </JoyShell>
  );
}
