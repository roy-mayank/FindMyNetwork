import { NetworkHome } from "@/components/network/NetworkHome";

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/80 px-6 py-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h1 className="text-2xl font-semibold tracking-tight">FindMyNetwork</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          You sit in the center; universities and companies branch out; people
          cluster on companies. Pan and zoom the graph, click any node for
          details—people include LinkedIn and alumni links when stored in the
          database, plus enrichment actions for Series A/B startup context.
        </p>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          The graph is loaded from the local SQLite API. Run{" "}
          <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            npm run db:migrate
          </code>{" "}
          and{" "}
          <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            npm run db:seed
          </code>{" "}
          once after clone. See README for MCP setup.
        </p>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
        <NetworkHome />
      </main>
    </div>
  );
}
