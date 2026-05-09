"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  COMPANY_FOCUS_FACTORS,
  COMPANY_FOCUS_FACTORS_STORAGE_KEY,
  allCompanyFocusFactorIds,
  buildCompanyFocusRows,
  enabledSetFromDisabledCompanyFocus,
  parseStoredCompanyFocusPrefs,
  serializeCompanyFocusPrefs,
  type CompanyFocusFactorId,
  type CompanyFocusRow,
} from "@/lib/company-focus-heuristic";
import type { NetworkData } from "@/lib/network-types";

const TOP_N = 5;

function readDisabledFromStorage(): Set<CompanyFocusFactorId> {
  const disabled = parseStoredCompanyFocusPrefs(
    localStorage.getItem(COMPANY_FOCUS_FACTORS_STORAGE_KEY),
  );
  return new Set(disabled);
}

export function CompanyFocusCard({ data }: { data: NetworkData | null }) {
  const [disabled, setDisabled] = useState<Set<CompanyFocusFactorId>>(() =>
    typeof window === "undefined" ? new Set() : readDisabledFromStorage(),
  );
  const [expanded, setExpanded] = useState(false);
  const [tuneOpen, setTuneOpen] = useState(false);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== COMPANY_FOCUS_FACTORS_STORAGE_KEY) return;
      setDisabled(readDisabledFromStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const enabled = useMemo(
    () => enabledSetFromDisabledCompanyFocus(disabled),
    [disabled],
  );

  const rows = useMemo(
    () => (data ? buildCompanyFocusRows(data, enabled) : []),
    [data, enabled],
  );

  const visible = expanded ? rows : rows.slice(0, TOP_N);

  const persistDisabled = useCallback((next: Set<CompanyFocusFactorId>) => {
    setDisabled(next);
    localStorage.setItem(
      COMPANY_FOCUS_FACTORS_STORAGE_KEY,
      serializeCompanyFocusPrefs(next),
    );
  }, []);

  const toggleFactor = useCallback(
    (id: CompanyFocusFactorId, include: boolean) => {
      const next = new Set(disabled);
      if (include) next.delete(id);
      else next.add(id);
      persistDisabled(next);
    },
    [disabled, persistDisabled],
  );

  const resetFactors = useCallback(() => {
    persistDisabled(new Set());
  }, [persistDisabled]);

  if (!data) return null;

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-white/85 shadow-sm dark:border-amber-500/30 dark:bg-zinc-900/65">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-amber-200/70 px-4 py-3 dark:border-amber-500/25">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Top companies to focus on
            <span className="ml-2 align-middle text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {rows.length} non-startup{rows.length === 1 ? "" : "s"}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Established companies ranked by their own heuristic — handy for
            picking what to research next.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTuneOpen((v) => !v)}
          aria-expanded={tuneOpen}
          className="shrink-0 rounded-full border border-amber-300/80 bg-white/80 px-3 py-1 text-[11px] font-semibold text-amber-900 shadow-sm transition hover:border-amber-500 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-zinc-900/70 dark:text-amber-100 dark:hover:bg-zinc-900"
        >
          {tuneOpen ? "Hide tune" : "Tune"}
        </button>
      </header>

      {tuneOpen ? (
        <div className="border-b border-amber-200/60 bg-amber-50/40 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-950/20">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              Score factors
            </h3>
            <button
              type="button"
              onClick={resetFactors}
              className="shrink-0 text-[10px] font-medium text-zinc-500 underline-offset-2 hover:text-amber-700 hover:underline dark:text-zinc-400 dark:hover:text-amber-300"
            >
              All on
            </button>
          </div>
          <p className="mt-1 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
            Unchecked = left out of the company-only ranking. Independent from
            the people queue toggles.
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {COMPANY_FOCUS_FACTORS.map((f) => {
              const included = !disabled.has(f.id);
              return (
                <li key={f.id}>
                  <label
                    className="flex cursor-pointer items-start gap-1.5"
                    title={f.description}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3 w-3 shrink-0 rounded border-amber-300 text-amber-600 focus:ring-amber-500 dark:border-amber-600 dark:bg-zinc-900"
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
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
          No established companies yet. Mark companies as non-startup in data
          collection to populate this list.
        </p>
      ) : (
        <>
          <ol className="divide-y divide-amber-200/60 dark:divide-amber-500/15">
            {visible.map((row, index) => (
              <CompanyRow key={row.company.id} row={row} rank={index + 1} />
            ))}
          </ol>
          {rows.length > TOP_N ? (
            <div className="border-t border-amber-200/60 px-4 py-2 text-right dark:border-amber-500/20">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
              >
                {expanded ? `Show top ${TOP_N}` : `Show all ${rows.length}`}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function CompanyRow({ row, rank }: { row: CompanyFocusRow; rank: number }) {
  return (
    <li>
      <Link
        href="/graph"
        className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-amber-50/70 dark:hover:bg-amber-950/25 sm:flex-nowrap"
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {rank}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              {row.company.label}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {row.industry ? <span>{row.industry}</span> : null}
              <span>
                {row.peopleCount} {row.peopleCount === 1 ? "person" : "people"}{" "}
                linked
              </span>
            </div>
            <CompanyBreakdownChips breakdown={row.breakdown} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-base font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {row.total}
          </span>
          <span className="ml-1 text-[10px] text-zinc-500 dark:text-zinc-500">
            score
          </span>
        </div>
      </Link>
    </li>
  );
}

function CompanyBreakdownChips({
  breakdown,
}: {
  breakdown: Partial<Record<CompanyFocusFactorId, number | null>>;
}) {
  const ids = allCompanyFocusFactorIds().filter((id) => id in breakdown);
  if (ids.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {ids.map((id) => {
        const v = breakdown[id];
        const label =
          COMPANY_FOCUS_FACTORS.find((f) => f.id === id)?.label.replace(
            /\s+score$/i,
            "",
          ) ?? id;
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
