"use client";

import { useCallback, useEffect, useState } from "react";

import { NetworkCanvas } from "@/components/network/NetworkCanvas";
import type { NetworkData } from "@/lib/network-types";

export function NetworkHome() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        <p className="font-medium">Could not load the graph from the API.</p>
        <p className="mt-2 opacity-90">{error}</p>
        <p className="mt-3 text-xs opacity-80">
          Run <code className="rounded bg-red-100 px-1 py-0.5 dark:bg-red-900">npm run db:migrate</code>{" "}
          then <code className="rounded bg-red-100 px-1 py-0.5 dark:bg-red-900">npm run db:seed</code>{" "}
          once, then refresh.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg bg-red-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-900"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[min(78vh,820px)] min-h-[480px] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Loading network…
      </div>
    );
  }

  return <NetworkCanvas data={data} onNetworkUpdated={() => void load()} />;
}
