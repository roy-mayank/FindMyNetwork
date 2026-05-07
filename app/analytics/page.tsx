import Link from "next/link";

import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { JoyShell, joyTitleClassName } from "@/components/layout/JoyShell";

export default function AnalyticsPage() {
  return (
    <JoyShell
      eyebrow="Network snapshot"
      title={<h1 className={joyTitleClassName()}>Analytics</h1>}
      description={
        <>
          High-level counts from your graph plus outreach timing from this browser (TPN average and total timer
          time). Deeper charts can build on this later.
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
            href="/graph"
            className="rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:brightness-110 dark:from-sky-600 dark:to-teal-500"
          >
            Graph
          </Link>
          <Link
            href="/collect"
            className="rounded-full border-2 border-amber-300/80 bg-white/90 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:border-amber-500 hover:bg-amber-50/90 dark:border-amber-500/40 dark:bg-zinc-900/80 dark:text-amber-100 dark:hover:bg-zinc-900"
          >
            Collect
          </Link>
          <Link
            href="/outreach"
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-fuchsia-500/25 transition hover:brightness-110 dark:from-fuchsia-600 dark:to-rose-600"
          >
            Outreach
          </Link>
        </>
      }
    >
      <AnalyticsDashboard />
    </JoyShell>
  );
}
