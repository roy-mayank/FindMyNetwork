import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-gradient-to-br from-amber-50 via-white to-sky-100 text-zinc-900 dark:from-slate-950 dark:via-violet-950/30 dark:to-sky-950/40 dark:text-zinc-50">
      <div
        className="pointer-events-none absolute right-0 top-1/4 h-80 w-80 translate-x-1/4 rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-600/10"
        aria-hidden
      />
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-amber-300/90">
            A little less grind, a little more clarity
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl dark:from-sky-300 dark:via-fuchsia-300 dark:to-amber-200">
            FindMyNetwork
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Log who you know and where they work, then see it on a map when you are ready to reach out.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
            <Link
              href="/collect"
              className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-amber-200/80 bg-white/90 p-6 text-left shadow-lg shadow-amber-200/20 transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-300/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-amber-500/25 dark:bg-zinc-900/75 dark:shadow-amber-900/20 dark:hover:border-amber-400/50"
            >
              <span className="absolute right-3 top-3 h-12 w-12 rounded-full bg-gradient-to-br from-amber-300 to-rose-400 opacity-40 blur-sm transition group-hover:opacity-70 dark:from-amber-500/40 dark:to-rose-500/40" />
              <span className="relative text-lg font-bold text-amber-950 dark:text-amber-100">
                Data collection
              </span>
              <span className="relative mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                Friendly forms for companies and people—no spreadsheet stare required.
              </span>
              <span className="relative mt-4 text-sm font-semibold text-rose-600 group-hover:underline dark:text-rose-300">
                Open forms →
              </span>
            </Link>

            <Link
              href="/graph"
              className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-sky-200/90 bg-white/90 p-6 text-left shadow-lg shadow-sky-200/25 transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-xl hover:shadow-sky-300/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-sky-500/30 dark:bg-zinc-900/75 dark:shadow-sky-900/25 dark:hover:border-sky-400/50"
            >
              <span className="absolute right-3 top-3 h-12 w-12 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 opacity-35 blur-sm transition group-hover:opacity-70 dark:from-sky-500/40 dark:to-violet-500/40" />
              <span className="relative text-lg font-bold text-sky-950 dark:text-sky-100">Your graph</span>
              <span className="relative mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                Pan, zoom, and cluster your network so the next step feels obvious.
              </span>
              <span className="relative mt-4 text-sm font-semibold text-violet-600 group-hover:underline dark:text-violet-300">
                Open graph →
              </span>
            </Link>

            <Link
              href="/outreach"
              className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-fuchsia-200/85 bg-white/90 p-6 text-left shadow-lg shadow-fuchsia-200/25 transition hover:-translate-y-0.5 hover:border-fuchsia-400 hover:shadow-xl hover:shadow-fuchsia-300/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-500 dark:border-fuchsia-500/30 dark:bg-zinc-900/75 dark:shadow-fuchsia-900/20 dark:hover:border-fuchsia-400/50"
            >
              <span className="absolute right-3 top-3 h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 opacity-35 blur-sm transition group-hover:opacity-70 dark:from-fuchsia-500/40 dark:to-rose-500/40" />
              <span className="relative text-lg font-bold text-fuchsia-950 dark:text-fuchsia-100">
                Quick outreach
              </span>
              <span className="relative mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                Update last reached and last attempt without opening the graph.
              </span>
              <span className="relative mt-4 text-sm font-semibold text-rose-600 group-hover:underline dark:text-rose-300">
                Open outreach →
              </span>
            </Link>

            <Link
              href="/analytics"
              className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-teal-200/85 bg-white/90 p-6 text-left shadow-lg shadow-teal-200/20 transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-300/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 dark:border-teal-500/30 dark:bg-zinc-900/75 dark:shadow-teal-900/20 dark:hover:border-teal-400/50"
            >
              <span className="absolute right-3 top-3 h-12 w-12 rounded-full bg-gradient-to-br from-teal-300 to-cyan-500 opacity-35 blur-sm transition group-hover:opacity-70 dark:from-teal-500/40 dark:to-cyan-500/40" />
              <span className="relative text-lg font-bold text-teal-950 dark:text-teal-100">Analytics</span>
              <span className="relative mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                Summaries and trends for your network—placeholder for now.
              </span>
              <span className="relative mt-4 text-sm font-semibold text-cyan-700 group-hover:underline dark:text-cyan-300">
                Open analytics →
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
