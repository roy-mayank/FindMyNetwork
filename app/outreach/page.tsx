import Link from "next/link";

import { JoyShell, joyTitleClassName } from "@/components/layout/JoyShell";
import { OutreachQueue } from "@/components/outreach/OutreachQueue";

export default function OutreachPage() {
  return (
    <JoyShell
      eyebrow="Priority queue"
      title={<h1 className={joyTitleClassName()}>Outreach</h1>}
      description={
        <>
          A ranked list of people to contact next, using an outreach score you can tune. Toggle heuristic
          factors on or off—disabled factors are left out of the score entirely. A separate company-focus
          list above the queue highlights non-startups worth deeper research. Heavier scoring logic is
          still to come; update reach dates from the graph or data collection.
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
            href="/analytics"
            className="rounded-full border-2 border-teal-300/80 bg-white/90 px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:border-teal-500 hover:bg-teal-50/90 dark:border-teal-500/40 dark:bg-zinc-900/80 dark:text-teal-100 dark:hover:bg-zinc-900"
          >
            Analytics
          </Link>
        </>
      }
    >
      <OutreachQueue />
    </JoyShell>
  );
}
