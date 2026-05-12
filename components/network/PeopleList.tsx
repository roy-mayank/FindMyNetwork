"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { PersonModal } from "@/components/network/PersonModal";
import { useInfiniteList } from "@/lib/use-infinite-list";
import type { NetworkData, PersonNetworkNode } from "@/lib/network-types";
import {
  OUTREACH_FACTORS_STORAGE_KEY,
  buildOutreachRankRows,
  enabledSetFromDisabled,
  parseStoredFactorPrefs,
  type OutreachFactorId,
  type OutreachRankRow,
} from "@/lib/outreach-heuristic";

type PeopleListProps = {
  data: NetworkData;
  focusId?: string;
  onNetworkUpdated: () => void;
  onFocusConsumed: () => void;
};

function readDisabledFromStorage(): Set<OutreachFactorId> {
  if (typeof window === "undefined") return new Set();
  const disabled = parseStoredFactorPrefs(
    window.localStorage.getItem(OUTREACH_FACTORS_STORAGE_KEY),
  );
  return new Set(disabled);
}

export function PeopleList({
  data,
  focusId,
  onNetworkUpdated,
  onFocusConsumed,
}: PeopleListProps) {
  const [query, setQuery] = useState("");
  const [hasEmailOnly, setHasEmailOnly] = useState(false);
  const [selected, setSelected] = useState<PersonNetworkNode | null>(null);
  const [disabledFactors, setDisabledFactors] = useState<Set<OutreachFactorId>>(
    () => readDisabledFromStorage(),
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== OUTREACH_FACTORS_STORAGE_KEY) return;
      setDisabledFactors(readDisabledFromStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const enabled = useMemo(
    () => enabledSetFromDisabled(disabledFactors),
    [disabledFactors],
  );

  const allRows: OutreachRankRow[] = useMemo(
    () => buildOutreachRankRows(data, enabled),
    [data, enabled],
  );

  const filteredRows: OutreachRankRow[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((row) => {
      if (hasEmailOnly) {
        const hasPrimary =
          typeof row.person.email === "string" && row.person.email.trim() !== "";
        const hasSecondary =
          typeof row.person.secondaryEmail === "string" &&
          row.person.secondaryEmail.trim() !== "";
        if (!hasPrimary && !hasSecondary) return false;
      }
      if (q === "") return true;
      const label = row.person.label.toLowerCase();
      const title = row.person.title?.toLowerCase() ?? "";
      return label.includes(q) || title.includes(q);
    });
  }, [allRows, query, hasEmailOnly]);

  const { visible, sentinelRef, hasMore, bumpToInclude } = useInfiniteList(
    filteredRows,
    10,
  );

  useEffect(() => {
    if (!focusId) return;
    const index = filteredRows.findIndex((r) => r.person.id === focusId);
    if (index < 0) {
      onFocusConsumed();
      return;
    }
    bumpToInclude(index);
    const raf = requestAnimationFrame(() => {
      const el = rowRefs.current.get(focusId);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      setHighlightId(focusId);
    });
    const clear = window.setTimeout(() => {
      setHighlightId(null);
      onFocusConsumed();
    }, 1500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(clear);
    };
  }, [focusId, filteredRows, bumpToInclude, onFocusConsumed]);

  const handleDelete = useCallback(
    (personId: string, label: string) => {
      const ok = window.confirm(
        `Delete ${label}? This removes the person and their edges. Cannot be undone.`,
      );
      if (!ok) return;
      setDeleteError(null);
      setDeletingId(personId);
      startTransition(async () => {
        try {
          const res = await fetch("/api/network/manual", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: personId, kind: "person" }),
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `HTTP ${res.status}`);
          }
          onNetworkUpdated();
        } catch (e) {
          setDeleteError(e instanceof Error ? e.message : "Delete failed");
        } finally {
          setDeletingId(null);
        }
      });
    },
    [onNetworkUpdated],
  );

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/80 dark:border-zinc-700/80 dark:bg-zinc-900/60">
      <PersonModal
        node={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onNetworkUpdated={onNetworkUpdated}
      />
      <div className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-700/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            People
            <span className="ml-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ({filteredRows.length}
              {filteredRows.length !== allRows.length ? ` of ${allRows.length}` : ""})
            </span>
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Sorted by outreach score (higher first). Tie-break: name A–Z.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search by name or title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[14rem] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-fuchsia-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <label className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={hasEmailOnly}
              onChange={(e) => setHasEmailOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-fuchsia-300 text-fuchsia-600 focus:ring-fuchsia-500 dark:border-fuchsia-600 dark:bg-zinc-900"
            />
            Has email
          </label>
        </div>
        {deleteError ? (
          <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-300">{deleteError}</p>
        ) : null}
      </div>
      {filteredRows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No people match the current filters.
        </p>
      ) : (
        <>
          <ol className="divide-y divide-zinc-200/70 dark:divide-zinc-700/80">
            {visible.map((row, index) => {
              const isHighlighted = highlightId === row.person.id;
              return (
                <li
                  key={row.person.id}
                  ref={(node) => {
                    if (node) rowRefs.current.set(row.person.id, node);
                    else rowRefs.current.delete(row.person.id);
                  }}
                  className={`relative transition ${
                    isHighlighted
                      ? "ring-2 ring-fuchsia-400 ring-inset dark:ring-fuchsia-500/70"
                      : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelected(row.person)}
                      className="flex min-w-0 flex-1 gap-3 text-left transition hover:opacity-90"
                    >
                      <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-fuchsia-600 dark:text-fuchsia-400">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {row.person.label}
                        </p>
                        {row.person.title ? (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {row.person.title}
                          </p>
                        ) : null}
                        {row.primaryEmployer ? (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                            {row.primaryEmployer.label}
                          </p>
                        ) : null}
                        {row.person.email ? (
                          <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                            {row.person.email}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                          View details →
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div>
                        <span className="text-lg font-bold tabular-nums text-violet-700 dark:text-violet-300">
                          {row.total}
                        </span>
                        <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-500">
                          pts
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === row.person.id}
                        onClick={() => handleDelete(row.person.id, row.person.label)}
                        className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-700/70 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        {deletingId === row.person.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div
            ref={sentinelRef}
            className="flex items-center justify-center px-4 py-3 text-[11px] text-zinc-500 dark:text-zinc-400"
          >
            {hasMore
              ? `Loading more… (${visible.length} of ${filteredRows.length})`
              : `End of list — ${filteredRows.length} ${
                  filteredRows.length === 1 ? "person" : "people"
                }`}
          </div>
        </>
      )}
    </section>
  );
}
