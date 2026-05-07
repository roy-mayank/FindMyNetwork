"use client";

import { useCallback, useEffect, useState } from "react";

import {
  calendarDaysUntilOptClockTrigger,
  countCompanyNodes,
  countPeopleWithReplySignals,
  countPersonNodes,
} from "@/lib/analytics-metrics";
import {
  OUTREACH_QUEUE_COMPLETE_STORAGE_KEY,
  countOutreachQueueCompletePeople,
} from "@/lib/outreach-complete-storage";
import {
  formatNetworkingDuration,
  formatTpn,
  loadTpnAggregate,
  type TpnAggregate,
} from "@/lib/outreach-tpn-storage";
import type { NetworkData } from "@/lib/network-types";

const card =
  "rounded-2xl border-2 border-white/80 bg-white/85 p-5 shadow-md shadow-violet-200/20 backdrop-blur-sm dark:border-violet-500/25 dark:bg-zinc-900/75 dark:shadow-violet-950/30";

export function AnalyticsDashboard() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nukeStep, setNukeStep] = useState<"idle" | "capital">("idle");
  const [mongoliaCapital, setMongoliaCapital] = useState("");
  const [nukeBusy, setNukeBusy] = useState(false);
  const [nukeMessage, setNukeMessage] = useState<string | null>(null);
  const [tpn, setTpn] = useState<TpnAggregate>(() => ({
    sessionCount: 0,
    sumTpnSeconds: 0,
    sumSessionElapsedSeconds: 0,
  }));
  const [queueCompletePeople, setQueueCompletePeople] = useState(0);

  const refreshTpn = useCallback(() => {
    setTpn(loadTpnAggregate());
  }, []);

  const refreshQueueCompletes = useCallback(() => {
    setQueueCompletePeople(countOutreachQueueCompletePeople());
  }, []);

  const loadNetwork = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/network", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setData((await res.json()) as NetworkData);
    } catch (e) {
      setData(null);
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    refreshTpn();
    refreshQueueCompletes();
    void loadNetwork();
  }, [loadNetwork, refreshQueueCompletes, refreshTpn]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        refreshTpn();
        refreshQueueCompletes();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshQueueCompletes, refreshTpn]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === OUTREACH_QUEUE_COMPLETE_STORAGE_KEY) refreshQueueCompletes();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshQueueCompletes]);

  const companies = data ? countCompanyNodes(data.nodes) : null;
  const people = data ? countPersonNodes(data.nodes) : null;
  const replied = data ? countPeopleWithReplySignals(data.nodes) : null;

  const globalAvgTpn =
    tpn.sessionCount > 0 ? tpn.sumTpnSeconds / tpn.sessionCount : null;

  const optClockDays = calendarDaysUntilOptClockTrigger();

  const beginNukeFlow = () => {
    setNukeMessage(null);
    if (
      !window.confirm(
        "This permanently deletes ALL data in your local SQLite database (companies, people, edges, drafts, enrichment, etc.). This cannot be undone. Do you want to continue?",
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        "Second confirmation: every row in the database will be erased and the schema will be recreated empty. Are you sure?",
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        "Final confirmation: you are about to wipe the entire SQLite file. There is no backup from this app. Proceed?",
      )
    ) {
      return;
    }
    setMongoliaCapital("");
    setNukeStep("capital");
  };

  const cancelNukeFlow = () => {
    setNukeStep("idle");
    setMongoliaCapital("");
    setNukeMessage(null);
  };

  const submitNuke = async () => {
    setNukeMessage(null);
    setNukeBusy(true);
    try {
      const res = await fetch("/api/db/nuke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mongoliaCapital }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNukeMessage(payload.error ?? `Request failed (${res.status})`);
        return;
      }
      setNukeMessage("Database was reset. Schema migrated; all previous data is gone.");
      setNukeStep("idle");
      setMongoliaCapital("");
      refreshTpn();
      refreshQueueCompletes();
      void loadNetwork();
    } catch (e) {
      setNukeMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setNukeBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Snapshot from your graph API and this browser&apos;s outreach timer and queue completions.
        </p>
        <button
          type="button"
          onClick={() => {
            refreshTpn();
            refreshQueueCompletes();
            void loadNetwork();
          }}
          className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-violet-400/25 hover:brightness-110"
        >
          Refresh
        </button>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-300/80 bg-rose-50/90 p-4 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className={card}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-teal-800 dark:text-teal-200">
            Global average TPN
          </h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-teal-950 dark:text-teal-50">
            {globalAvgTpn !== null ? formatTpn(globalAvgTpn) : "—"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Mean time-per-person across completed outreach sessions on the Outreach page (
            {tpn.sessionCount} session{tpn.sessionCount === 1 ? "" : "s"}).
          </p>
        </section>

        <section className={card}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
            Time spent networking
          </h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-sky-950 dark:text-sky-50">
            {formatNetworkingDuration(tpn.sumSessionElapsedSeconds)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Sum of wall-clock time from every saved outreach timer session in this browser.
          </p>
        </section>

        <section className={card}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            Outreach queue completes
          </h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-950 dark:text-emerald-50">
            {queueCompletePeople}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Distinct people you marked <span className="font-semibold">Complete</span> from the outreach queue
            detail modal in this browser (stored locally; repeats on the same person still count once).
          </p>
        </section>

        <section className={card}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Company nodes
          </h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-amber-950 dark:text-amber-50">
            {companies === null ? "…" : companies}
          </p>
        </section>

        <section className={card}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-fuchsia-800 dark:text-fuchsia-200">
            People nodes
          </h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-fuchsia-950 dark:text-fuchsia-50">
            {people === null ? "…" : people}
          </p>
        </section>

        <section className={card}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-rose-800 dark:text-rose-200">
            OPT clock trigger
          </h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-rose-950 dark:text-rose-50">
            {optClockDays}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {optClockDays > 0
              ? "Whole local calendar days from today to June 1, 2027 (start of June 2027)."
              : optClockDays === 0
                ? "Today is June 1, 2027 on your local calendar."
                : "Negative values mean June 1, 2027 has already passed (days since that date)."}
          </p>
        </section>

        <section className={`${card} sm:col-span-2`}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
            People with reply-style updates
          </h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-violet-950 dark:text-violet-50">
            {replied === null ? "…" : replied}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Count of people who have a numeric <span className="font-semibold">last outreach score</span> and/or{" "}
            <span className="font-semibold">confidence</span> saved (typically from Collect → Update after they
            reply). Adjust your workflow if you want this to match a stricter definition later.
          </p>
        </section>

        <section
          className={`${card} sm:col-span-2 border-rose-300/90 dark:border-rose-600/50`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wide text-rose-800 dark:text-rose-200">
            Danger zone
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Remove the local SQLite database file and re-run migrations. You will go through three browser
            confirmations, then answer a short verification question. Intended for local development only.
          </p>
          {nukeStep === "idle" ? (
            <button
              type="button"
              onClick={beginNukeFlow}
              className="mt-4 rounded-full border-2 border-rose-400/90 bg-rose-50/90 px-4 py-2 text-sm font-semibold text-rose-950 shadow-sm transition hover:border-rose-600 hover:bg-rose-100/90 dark:border-rose-500/50 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:border-rose-400"
            >
              Delete entire SQLite database…
            </button>
          ) : (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-900/50 dark:bg-rose-950/25">
              <label className="block text-sm font-medium text-rose-950 dark:text-rose-100">
                What is the capital of Mongolia?
                <input
                  type="text"
                  value={mongoliaCapital}
                  onChange={(e) => setMongoliaCapital(e.target.value)}
                  autoComplete="off"
                  className="mt-2 w-full rounded-lg border border-rose-300/80 bg-white px-3 py-2 text-zinc-900 shadow-sm dark:border-rose-700/60 dark:bg-zinc-900 dark:text-zinc-100"
                  disabled={nukeBusy}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submitNuke()}
                  disabled={nukeBusy || !mongoliaCapital.trim()}
                  className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-500/30 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {nukeBusy ? "Working…" : "Confirm delete"}
                </button>
                <button
                  type="button"
                  onClick={cancelNukeFlow}
                  disabled={nukeBusy}
                  className="rounded-full border-2 border-zinc-300/80 bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {nukeMessage ? (
            <p
              className={`mt-3 text-sm ${nukeMessage.startsWith("Database was reset") ? "text-emerald-800 dark:text-emerald-200" : "text-rose-800 dark:text-rose-200"}`}
            >
              {nukeMessage}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
