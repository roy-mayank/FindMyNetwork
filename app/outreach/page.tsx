import Link from "next/link";

import { OutreachQuickForm } from "@/components/outreach/OutreachQuickForm";

export default function OutreachPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/80 px-6 py-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quick outreach</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Update last reached and last attempt without opening the graph. Voice capture is ready for
              your future transcription pipeline.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Graph home
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
        <OutreachQuickForm />
      </main>
    </div>
  );
}
