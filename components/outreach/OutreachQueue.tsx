"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updatePersonReachAction } from "@/app/actions/network";
import { CompanyFocusCard } from "@/components/outreach/CompanyFocusCard";
import { OutreachPersonDetailModal } from "@/components/outreach/OutreachPersonDetailModal";
import { OutreachSessionTimer } from "@/components/outreach/OutreachSessionTimer";
import { recordOutreachQueueComplete } from "@/lib/outreach-complete-storage";
import {
  OUTREACH_FACTORS,
  OUTREACH_FACTORS_STORAGE_KEY,
  OUTREACH_INTRINSIC_LABELS,
  OUTREACH_INTRINSIC_POINTS,
  allOutreachFactorIds,
  buildOutreachRankRows,
  enabledSetFromDisabled,
  outreachStoredTodayISO,
  parseStoredFactorPrefs,
  personOutreachedOnStoredCalendarDay,
  serializeFactorPrefs,
  type OutreachFactorId,
  type OutreachIntrinsicId,
  type OutreachRankRow,
} from "@/lib/outreach-heuristic";
import type { NetworkData } from "@/lib/network-types";

function readDisabledFromStorage(): Set<OutreachFactorId> {
  const disabled = parseStoredFactorPrefs(localStorage.getItem(OUTREACH_FACTORS_STORAGE_KEY));
  return new Set(disabled);
}

export function OutreachQueue() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<OutreachRankRow | null>(null);
  const [disabledFactors, setDisabledFactors] = useState<Set<OutreachFactorId>>(() =>
    typeof window === "undefined" ? new Set() : readDisabledFromStorage(),
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== OUTREACH_FACTORS_STORAGE_KEY) return;
      setDisabledFactors(readDisabledFromStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
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
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const enabled = useMemo(() => enabledSetFromDisabled(disabledFactors), [disabledFactors]);

  const rows = useMemo(() => {
    if (!data) return [];
    const day = outreachStoredTodayISO();
    return buildOutreachRankRows(data, enabled).filter(
      (r) => !personOutreachedOnStoredCalendarDay(r.person, day),
    );
  }, [data, enabled]);

  const persistDisabled = useCallback((next: Set<OutreachFactorId>) => {
    setDisabledFactors(next);
    localStorage.setItem(OUTREACH_FACTORS_STORAGE_KEY, serializeFactorPrefs(next));
  }, []);

  const toggleFactor = useCallback(
    (id: OutreachFactorId, include: boolean) => {
      const next = new Set(disabledFactors);
      if (include) next.delete(id);
      else next.add(id);
      persistDisabled(next);
    },
    [disabledFactors, persistDisabled],
  );

  const resetFactors = useCallback(() => {
    persistDisabled(new Set());
  }, [persistDisabled]);

  const personCount = data ? data.nodes.filter((n) => n.kind === "person").length : 0;

  const completeSelected = useCallback(async () => {
    if (!selectedRow) return;
    const result = await updatePersonReachAction({
      personId: selectedRow.person.id,
      lastOutreachAt: outreachStoredTodayISO(),
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    recordOutreachQueueComplete(selectedRow.person.id);
    setSelectedRow(null);
    await load();
  }, [load, selectedRow]);

  const sidebarClass =
    "flex shrink-0 flex-col gap-4 lg:sticky lg:top-4 lg:w-64 xl:w-[17rem]";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row lg:items-start lg:gap-6 xl:gap-8">
      <OutreachPersonDetailModal
        open={selectedRow != null}
        row={selectedRow}
        network={data}
        onLater={() => setSelectedRow(null)}
        onComplete={completeSelected}
      />
      <aside className={`order-2 lg:order-none ${sidebarClass}`}>
        <section className="rounded-xl border border-fuchsia-200/60 bg-white/85 p-2.5 shadow-md dark:border-fuchsia-500/25 dark:bg-zinc-900/75">
          <div className="flex items-start justify-between gap-1">
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-900 dark:text-fuchsia-200">
              Score factors
            </h2>
            <button
              type="button"
              onClick={resetFactors}
              className="shrink-0 text-[9px] font-medium text-zinc-500 underline-offset-2 hover:text-fuchsia-700 hover:underline dark:text-zinc-400 dark:hover:text-fuchsia-300"
            >
              All on
            </button>
          </div>
          <p className="mt-1 text-[9px] leading-snug text-zinc-500 dark:text-zinc-400">
            Unchecked = left out of ranking. Hover a row for details.
          </p>
          <ul className="mt-2 space-y-1.5">
            {OUTREACH_FACTORS.map((f) => {
              const included = !disabledFactors.has(f.id);
              return (
                <li key={f.id}>
                  <label
                    className="flex cursor-pointer items-start gap-1.5"
                    title={f.description}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3 w-3 shrink-0 rounded border-fuchsia-300 text-fuchsia-600 focus:ring-fuchsia-500 dark:border-fuchsia-600 dark:bg-zinc-900"
                      checked={included}
                      onChange={(e) => toggleFactor(f.id, e.target.checked)}
                    />
                    <span className="min-w-0 text-[11px] font-medium leading-tight text-zinc-800 dark:text-zinc-200">
                      {f.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 border-t border-fuchsia-200/50 pt-2 text-[9px] leading-snug text-zinc-500 dark:border-fuchsia-500/25 dark:text-zinc-400">
            Penn (UPenn) grads: +{OUTREACH_INTRINSIC_POINTS.pennGrad} when marked in data collection
            — always included, not toggled here.
          </p>
        </section>
      </aside>

      <div className="order-1 min-w-0 flex-1 flex flex-col gap-6 lg:order-none">
      {loadError ? (
        <div className="rounded-2xl border border-rose-300/80 bg-rose-50/90 p-5 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100">
          {loadError}
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110"
          >
            Retry
          </button>
        </div>
      ) : !data ? (
        <p className="text-sm font-medium text-violet-800 dark:text-violet-200">Loading network…</p>
      ) : personCount === 0 ? (
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          No people in the graph yet. Add someone from{" "}
          <Link
            href="/collect"
            className="font-semibold text-fuchsia-700 underline-offset-2 hover:underline dark:text-fuchsia-300"
          >
            data collection
          </Link>{" "}
          or seed the database.
        </p>
      ) : (
        <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/graph"
          className="rounded-full border border-sky-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm transition hover:border-sky-400 dark:border-sky-500/40 dark:bg-zinc-900/80 dark:text-sky-100"
        >
          ← Graph
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-400/25 hover:brightness-110"
          >
            Refresh
          </button>
        </div>
      </div>

      <CompanyFocusCard data={data} />

      <section className="rounded-2xl border border-zinc-200/80 bg-white/80 dark:border-zinc-700/80 dark:bg-zinc-900/60">
        <div className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-700/80">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Who to reach next</h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Sorted by outreach score (higher first). Tie-break: name A–Z. Anyone you mark{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Complete</span> today is hidden here until
            the next UTC day (same rule as the quick outreach form).
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            No one left in today&apos;s queue—everyone may already be marked reached for today, or the graph has no
            people. Use <span className="font-medium">Refresh</span> after updates elsewhere.
          </p>
        ) : (
        <ol className="divide-y divide-zinc-200/70 dark:divide-zinc-700/80">
          {rows.map((row, index) => (
            <li key={row.person.id} className="px-0">
              <button
                type="button"
                onClick={() => setSelectedRow(row)}
                className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-violet-50/80 dark:hover:bg-violet-950/25 sm:flex-nowrap"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-fuchsia-600 dark:text-fuchsia-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.person.label}</p>
                    {row.person.title ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{row.person.title}</p>
                    ) : null}
                    {row.primaryEmployer ? (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                        {row.primaryEmployer.label}
                      </p>
                    ) : null}
                    <BreakdownChips breakdown={row.breakdown} intrinsic={row.intrinsic} />
                    <p className="mt-2 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                      View details →
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-lg font-bold tabular-nums text-violet-700 dark:text-violet-300">
                    {row.total}
                  </span>
                  <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-500">score</span>
                </div>
              </button>
            </li>
          ))}
        </ol>
        )}
      </section>
        </>
      )}
      </div>

      <aside className={`order-3 lg:order-none ${sidebarClass}`}>
        <OutreachSessionTimer compact />
      </aside>
    </div>
  );
}

function BreakdownChips({
  breakdown,
  intrinsic,
}: {
  breakdown: Partial<Record<OutreachFactorId, number | null>>;
  intrinsic: Partial<Record<OutreachIntrinsicId, number>>;
}) {
  const ids = allOutreachFactorIds().filter((id) => id in breakdown);
  const intrinsicIds = (Object.keys(intrinsic) as OutreachIntrinsicId[]).filter(
    (id) => typeof intrinsic[id] === "number",
  );
  if (ids.length === 0 && intrinsicIds.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {intrinsicIds.map((id) => {
        const v = intrinsic[id];
        return (
          <span
            key={id}
            className="inline-flex rounded-full border border-violet-200/80 bg-violet-50/90 px-2 py-0.5 text-[10px] font-medium text-violet-900 dark:border-violet-500/35 dark:bg-violet-950/40 dark:text-violet-200"
          >
            {OUTREACH_INTRINSIC_LABELS[id]}
            {typeof v === "number" ? `: ${v}` : ""}
          </span>
        );
      })}
      {ids.map((id) => {
        const v = breakdown[id];
        const label =
          OUTREACH_FACTORS.find((f) => f.id === id)?.label.replace(/\s+score$/i, "") ?? id;
        return (
          <span
            key={id}
            className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {label}
            {typeof v === "number" ? `: ${v}` : ": —"}
          </span>
        );
      })}
    </div>
  );
}
