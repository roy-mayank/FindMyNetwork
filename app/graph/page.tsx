import Link from "next/link";

import { JoyShell, joyTitleClassName } from "@/components/layout/JoyShell";
import { NetworkHome } from "@/components/network/NetworkHome";

export default function GraphPage() {
  return (
    <JoyShell
      eyebrow="Your network map"
      title={<h1 className={joyTitleClassName()}>FindMyNetwork</h1>}
      description={
        <>
          <p>
            You sit in the center; universities and companies branch out; people cluster on companies.
            Pan and zoom the graph, click any node for details—people include LinkedIn and alumni links
            when stored in the database, plus enrichment actions for Series A/B startup context.
          </p>
          <p className="mt-3">
            The graph is loaded from the local SQLite API. Run{" "}
            <code className="rounded-md bg-violet-100/90 px-1.5 py-0.5 text-xs font-mono text-violet-900 dark:bg-violet-950/80 dark:text-violet-100">
              npm run db:migrate
            </code>{" "}
            and{" "}
            <code className="rounded-md bg-violet-100/90 px-1.5 py-0.5 text-xs font-mono text-violet-900 dark:bg-violet-950/80 dark:text-violet-100">
              npm run db:seed
            </code>{" "}
            once after clone. See README for API secret and manual enrichment.
          </p>
        </>
      }
      actions={
        <>
          <Link
            href="/"
            className="rounded-full border-2 border-violet-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-violet-800 shadow-sm transition hover:border-violet-400 hover:bg-white dark:border-violet-500/40 dark:bg-zinc-900/80 dark:text-violet-100 dark:hover:border-amber-400/60 dark:hover:bg-zinc-900"
          >
            Home
          </Link>
          <Link
            href="/outreach"
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-fuchsia-500/25 transition hover:brightness-110 dark:from-fuchsia-600 dark:to-rose-600"
          >
            Quick outreach
          </Link>
          <Link
            href="/collect"
            className="rounded-full border-2 border-amber-300/80 bg-white/90 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:border-amber-500 hover:bg-amber-50/90 dark:border-amber-500/40 dark:bg-zinc-900/80 dark:text-amber-100 dark:hover:bg-zinc-900"
          >
            Collect
          </Link>
          <Link
            href="/analytics"
            className="rounded-full border-2 border-teal-300/80 bg-white/90 px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:border-teal-500 hover:bg-teal-50/90 dark:border-teal-500/40 dark:bg-zinc-900/80 dark:text-teal-100 dark:hover:bg-zinc-900"
          >
            Analytics
          </Link>
        </>
      }
    >
      <NetworkHome />
    </JoyShell>
  );
}
