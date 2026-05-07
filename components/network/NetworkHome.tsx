"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { NetworkCanvas } from "@/components/network/NetworkCanvas";
import type { ClusterGroupBy, NetworkData } from "@/lib/network-types";

export function NetworkHome() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clustered, setClustered] = useState(true);
  const [groupBy, setGroupBy] = useState<ClusterGroupBy>("industry");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/network", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as NetworkData;
      setData(json);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load network");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  if (error) {
    return (
      <div className="rounded-3xl border-2 border-rose-300/80 bg-gradient-to-br from-rose-50 to-amber-50 p-6 text-sm text-rose-950 shadow-lg dark:border-rose-500/40 dark:from-rose-950/50 dark:to-amber-950/30 dark:text-rose-100">
        <p className="font-bold">Could not load the graph from the API.</p>
        <p className="mt-2 opacity-90">{error}</p>
        <p className="mt-3 text-xs opacity-90">
          Run <code className="rounded-md bg-white/80 px-1 py-0.5 dark:bg-rose-900/60">npm run db:migrate</code>{" "}
          then <code className="rounded-md bg-white/80 px-1 py-0.5 dark:bg-rose-900/60">npm run db:seed</code>{" "}
          once, then refresh.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[min(78vh,820px)] min-h-[480px] items-center justify-center rounded-3xl border-2 border-dashed border-violet-300/70 bg-white/50 text-sm font-medium text-violet-800 shadow-inner dark:border-violet-500/40 dark:bg-zinc-900/40 dark:text-violet-200">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-500 [animation-delay:-0.08s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500" />
          <span className="ml-1">Loading your network…</span>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm dark:border-violet-500/25 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setClustered((current) => !current)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              clustered
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 hover:brightness-110"
                : "border-2 border-violet-200/80 bg-white/90 text-violet-900 hover:border-violet-400 dark:border-violet-500/40 dark:bg-zinc-900/80 dark:text-violet-100"
            }`}
          >
            Clustering: {clustered ? "On" : "Off"}
          </button>
          <label className="text-xs font-semibold text-violet-800 dark:text-amber-200/90">
            Group by
            <select
              value={groupBy}
              disabled={!clustered}
              onChange={(e) => setGroupBy(e.target.value as ClusterGroupBy)}
              className="ml-2 rounded-xl border-2 border-sky-200/90 bg-white px-2 py-2 text-xs font-medium text-zinc-900 shadow-inner disabled:opacity-50 dark:border-violet-500/40 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="industry">Industry</option>
              <option value="company">Company</option>
              <option value="startup">Startup vs established</option>
              <option value="outreach">Outreach recency</option>
            </select>
          </label>
        </div>
        <Link
          href="/collect"
          className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-400/20 transition hover:brightness-110"
        >
          Data collection
        </Link>
      </div>
      <NetworkCanvas
        data={data}
        clustered={clustered}
        groupBy={groupBy}
        onNetworkUpdated={() => void load()}
      />
    </div>
  );
}
