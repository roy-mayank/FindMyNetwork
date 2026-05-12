"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GraphLists, type ListTab } from "@/components/network/GraphLists";
import { NetworkCanvas } from "@/components/network/NetworkCanvas";
import type {
  ClusterGroupBy,
  NetworkData,
  NetworkNode,
} from "@/lib/network-types";

type GraphView = "graph" | "lists";

type NetworkHomeProps = {
  initialView?: GraphView;
  initialListTab?: ListTab;
  initialFocusId?: string;
};

function buildGraphUrl(params: {
  view: GraphView;
  listTab: ListTab;
  focus?: string;
}): string {
  const search = new URLSearchParams();
  if (params.view !== "graph") search.set("view", params.view);
  if (params.view === "lists" && params.listTab !== "people") {
    search.set("listTab", params.listTab);
  }
  if (params.focus) search.set("focus", params.focus);
  const qs = search.toString();
  return qs ? `/graph?${qs}` : "/graph";
}

export function NetworkHome({
  initialView = "graph",
  initialListTab = "people",
  initialFocusId,
}: NetworkHomeProps) {
  const router = useRouter();
  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clustered, setClustered] = useState(true);
  const [groupBy, setGroupBy] = useState<ClusterGroupBy>("industry");
  const [view, setView] = useState<GraphView>(initialView);
  const [listTab, setListTab] = useState<ListTab>(initialListTab);
  const [focusId, setFocusId] = useState<string | undefined>(initialFocusId);

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

  const syncUrl = useCallback(
    (next: { view: GraphView; listTab: ListTab; focus?: string }) => {
      router.replace(buildGraphUrl(next), { scroll: false });
    },
    [router],
  );

  const switchView = useCallback(
    (nextView: GraphView) => {
      setView(nextView);
      const nextFocus = nextView === "lists" ? focusId : undefined;
      if (nextView !== "lists" && focusId) setFocusId(undefined);
      syncUrl({ view: nextView, listTab, focus: nextFocus });
    },
    [focusId, listTab, syncUrl],
  );

  const switchListTab = useCallback(
    (nextTab: ListTab) => {
      setListTab(nextTab);
      setFocusId(undefined);
      syncUrl({ view: "lists", listTab: nextTab, focus: undefined });
    },
    [syncUrl],
  );

  const handleFocusConsumed = useCallback(() => {
    setFocusId(undefined);
    syncUrl({ view: "lists", listTab, focus: undefined });
  }, [listTab, syncUrl]);

  const handleNodeFocus = useCallback(
    (node: NetworkNode): boolean => {
      if (node.kind !== "person" && node.kind !== "company") return false;
      const nextListTab: ListTab = node.kind === "person" ? "people" : "companies";
      setView("lists");
      setListTab(nextListTab);
      setFocusId(node.id);
      syncUrl({ view: "lists", listTab: nextListTab, focus: node.id });
      return true;
    },
    [syncUrl],
  );

  const currentFocus = useMemo(() => {
    if (view !== "lists") return undefined;
    return focusId;
  }, [view, focusId]);

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
      <div
        role="tablist"
        aria-label="Graph view"
        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200/60 bg-white/70 p-2 shadow-sm backdrop-blur-sm dark:border-violet-500/25 dark:bg-zinc-900/50"
      >
        <div className="flex flex-wrap items-center gap-2">
          <TopTabButton
            active={view === "graph"}
            onClick={() => switchView("graph")}
            label="Graph"
          />
          <TopTabButton
            active={view === "lists"}
            onClick={() => switchView("lists")}
            label="Lists"
          />
        </div>
        <Link
          href="/collect"
          className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-400/20 transition hover:brightness-110"
        >
          Data collection
        </Link>
      </div>

      {view === "graph" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm dark:border-violet-500/25 dark:bg-zinc-900/50">
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
            <p className="ml-auto text-[11px] text-zinc-500 dark:text-zinc-400">
              Click a person or company node to jump to its row in the Lists tab.
            </p>
          </div>
          <NetworkCanvas
            data={data}
            clustered={clustered}
            groupBy={groupBy}
            onNetworkUpdated={() => void load()}
            onNodeFocus={handleNodeFocus}
          />
        </div>
      ) : (
        <GraphLists
          data={data}
          listTab={listTab}
          focusId={currentFocus}
          onTabChange={switchListTab}
          onNetworkUpdated={() => void load()}
          onFocusConsumed={handleFocusConsumed}
        />
      )}
    </div>
  );
}

function TopTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-bold transition ${
        active
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 hover:brightness-110"
          : "border-2 border-violet-200/80 bg-white/90 text-violet-900 hover:border-violet-400 dark:border-violet-500/40 dark:bg-zinc-900/80 dark:text-violet-100"
      }`}
    >
      {label}
    </button>
  );
}
