"use client";

import { useEffect, useRef, useState } from "react";

import {
  appendTpnSession,
  formatTpn,
  loadTpnAggregate,
  resetTpnAggregate,
  type TpnAggregate,
} from "@/lib/outreach-tpn-storage";

const oLabelBase =
  "block font-semibold uppercase tracking-wide text-violet-800/90 dark:text-amber-200/90";
const oInputBase =
  "w-full rounded-lg border-2 border-sky-200/90 bg-white/95 text-zinc-900 shadow-inner outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-amber-200/80 dark:border-violet-500/35 dark:bg-zinc-950/90 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-fuchsia-500/35";
const oSectionBase =
  "border-2 border-amber-200/60 bg-white/85 shadow-md shadow-amber-200/15 backdrop-blur-sm dark:border-violet-500/25 dark:bg-zinc-900/70 dark:shadow-violet-950/20";

function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export type OutreachSessionTimerProps = {
  /** Narrow column layout with tighter copy (e.g. outreach page sidebar). */
  compact?: boolean;
};

export function OutreachSessionTimer({ compact = false }: OutreachSessionTimerProps) {
  type Phase = "idle" | "running" | "review";
  const [phase, setPhase] = useState<Phase>("idle");
  const startedAtRef = useRef<number | null>(null);
  const [tick, setTick] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [peopleInput, setPeopleInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSessionTpn, setLastSessionTpn] = useState<string | null>(null);
  const [aggregate, setAggregate] = useState<TpnAggregate>({
    sessionCount: 0,
    sumTpnSeconds: 0,
    sumSessionElapsedSeconds: 0,
  });
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualPeople, setManualPeople] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    setAggregate(loadTpnAggregate());
  }, []);

  useEffect(() => {
    if (phase !== "running" || startedAtRef.current === null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [phase]);

  const liveMs =
    phase === "running" && startedAtRef.current !== null
      ? Date.now() - startedAtRef.current + tick * 0
      : elapsedMs;

  const start = () => {
    setFormError(null);
    setLastSessionTpn(null);
    setPeopleInput("");
    startedAtRef.current = Date.now();
    setTick(0);
    setPhase("running");
  };

  const stop = () => {
    if (startedAtRef.current === null) return;
    setElapsedMs(Date.now() - startedAtRef.current);
    startedAtRef.current = null;
    setPeopleInput("");
    setFormError(null);
    setPhase("review");
  };

  const cancelReview = () => {
    setPhase("idle");
    setElapsedMs(0);
    setPeopleInput("");
    setFormError(null);
  };

  const commitSessionToAggregate = (sessionElapsedMs: number, peopleCount: number) => {
    const { tpnSeconds, aggregate: next } = appendTpnSession(sessionElapsedMs, peopleCount);
    setAggregate(next);
    setLastSessionTpn(formatTpn(tpnSeconds));
  };

  const submitSession = () => {
    setFormError(null);
    const n = Number.parseInt(peopleInput.trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      setFormError("Enter how many people you reached out to (whole number, at least 1).");
      return;
    }
    commitSessionToAggregate(elapsedMs, n);
    setPhase("idle");
    setElapsedMs(0);
    setPeopleInput("");
  };

  const submitManualSession = () => {
    setManualError(null);
    if (phase === "running") {
      setManualError("Stop the live timer first, or wait until you are not recording.");
      return;
    }
    const hRaw = manualHours.trim() === "" ? 0 : Number.parseInt(manualHours.trim(), 10);
    const mRaw = manualMinutes.trim() === "" ? 0 : Number.parseInt(manualMinutes.trim(), 10);
    const people = Number.parseInt(manualPeople.trim(), 10);
    if (!Number.isFinite(hRaw) || hRaw < 0 || !Number.isFinite(mRaw) || mRaw < 0) {
      setManualError("Hours and minutes must be whole numbers (0 or greater).");
      return;
    }
    const totalMinutes = hRaw * 60 + mRaw;
    const totalMs = totalMinutes * 60 * 1000;
    if (totalMinutes < 1) {
      setManualError("Enter at least 1 minute of session time (e.g. 0 hours and 1 minute).");
      return;
    }
    if (!Number.isFinite(people) || people < 1) {
      setManualError("Enter how many people you reached out to (whole number, at least 1).");
      return;
    }
    commitSessionToAggregate(totalMs, people);
    setManualHours("");
    setManualMinutes("");
    setManualPeople("");
  };

  const globalAvgSeconds =
    aggregate.sessionCount > 0 ? aggregate.sumTpnSeconds / aggregate.sessionCount : null;

  const oLabel = compact
    ? `text-[9px] ${oLabelBase}`
    : `text-[10px] ${oLabelBase}`;
  const oInput = compact
    ? `mt-0.5 py-1 px-2 text-[11px] ${oInputBase}`
    : `mt-0.5 px-2.5 py-1.5 text-xs ${oInputBase}`;
  const oSection = [
    oSectionBase,
    compact ? "rounded-xl p-2.5" : "rounded-2xl p-4",
  ].join(" ");

  return (
    <section className={oSection}>
      <h2
        className={
          compact
            ? "text-xs font-bold text-emerald-900 dark:text-emerald-100"
            : "text-base font-bold text-emerald-900 dark:text-emerald-100"
        }
      >
        Session & TPN
      </h2>
      {compact ? (
        <p className="mt-1 text-[10px] leading-snug text-zinc-600 dark:text-zinc-400">
          Live timer; TPN = time ÷ people. Manual entry if you forgot Start.
        </p>
      ) : (
        <p className="mt-0.5 text-xs leading-snug text-zinc-700 dark:text-zinc-300">
          <span className="font-semibold text-violet-800 dark:text-violet-200">Start</span> /{" "}
          <span className="font-semibold text-violet-800 dark:text-violet-200">Stop</span> for live time;{" "}
          <span className="font-semibold">TPN</span> = session time ÷ people →{" "}
          <span className="font-semibold">running average</span> (this browser). Forgot the timer? Use{" "}
          <span className="font-semibold">Manual session</span> below.
        </p>
      )}

      <div
        className={
          compact
            ? "mt-2 grid gap-2"
            : "mt-2.5 grid gap-2.5 sm:grid-cols-2 sm:items-start"
        }
      >
        <div
          className={
            compact
              ? "rounded-lg border border-emerald-200/70 bg-emerald-50/40 px-2 py-1.5 dark:border-emerald-800/50 dark:bg-emerald-950/25"
              : "rounded-xl border border-emerald-200/70 bg-emerald-50/40 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/25"
          }
        >
          <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
            Avg TPN
          </p>
          <p
            className={
              compact
                ? "mt-0.5 text-sm font-bold tabular-nums leading-tight text-emerald-950 dark:text-emerald-50"
                : "mt-0.5 text-lg font-bold tabular-nums leading-tight text-emerald-950 dark:text-emerald-50"
            }
          >
            {globalAvgSeconds !== null ? formatTpn(globalAvgSeconds) : "—"}
          </p>
          <p className="mt-0.5 text-[9px] leading-snug text-emerald-900/80 dark:text-emerald-200/80">
            {aggregate.sessionCount > 0
              ? `${aggregate.sessionCount} session${aggregate.sessionCount === 1 ? "" : "s"}`
              : "No sessions yet"}
          </p>
          {aggregate.sessionCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Clear all TPN session history and the global average?")) return;
                resetTpnAggregate();
                setAggregate(loadTpnAggregate());
                setLastSessionTpn(null);
              }}
              className="mt-1 text-[9px] font-semibold text-rose-700 underline-offset-2 hover:underline dark:text-rose-300"
            >
              Reset
            </button>
          ) : null}
        </div>

        <div
          className={
            compact
              ? "flex flex-wrap items-center gap-1.5"
              : "flex flex-wrap items-center gap-2 sm:min-h-[4.25rem] sm:justify-end"
          }
        >
          {phase === "idle" ? (
            <button
              type="button"
              onClick={start}
              className={
                compact
                  ? "rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm shadow-emerald-400/20 transition hover:brightness-110"
                  : "rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-400/20 transition hover:brightness-110"
              }
            >
              Start
            </button>
          ) : null}
          {phase === "running" ? (
            <>
              <div
                className={
                  compact
                    ? "min-w-[4.5rem] rounded-md border-2 border-emerald-300/80 bg-white/90 px-1.5 py-0.5 text-center font-mono text-sm font-bold tabular-nums text-emerald-950 dark:border-emerald-600/50 dark:bg-zinc-900 dark:text-emerald-100"
                    : "min-w-[5.5rem] rounded-lg border-2 border-emerald-300/80 bg-white/90 px-2.5 py-1 text-center font-mono text-base font-bold tabular-nums text-emerald-950 dark:border-emerald-600/50 dark:bg-zinc-900 dark:text-emerald-100"
                }
                aria-live="polite"
              >
                {formatClock(liveMs)}
              </div>
              <button
                type="button"
                onClick={stop}
                className={
                  compact
                    ? "rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm shadow-rose-400/20 transition hover:brightness-110"
                    : "rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-400/20 transition hover:brightness-110"
                }
              >
                Stop
              </button>
            </>
          ) : null}
        </div>
      </div>

      {lastSessionTpn ? (
        <p
          className={
            compact
              ? "mt-1.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200"
              : "mt-2 text-xs font-semibold text-violet-800 dark:text-violet-200"
          }
          role="status"
        >
          Last TPN: {lastSessionTpn}
        </p>
      ) : null}

      {phase === "review" ? (
        <div
          className={
            compact
              ? "mt-2 rounded-lg border-2 border-violet-200/80 bg-violet-50/50 p-2 dark:border-violet-600/40 dark:bg-violet-950/30"
              : "mt-2.5 rounded-xl border-2 border-violet-200/80 bg-violet-50/50 p-3 dark:border-violet-600/40 dark:bg-violet-950/30"
          }
        >
          <p
            className={
              compact
                ? "text-[10px] font-medium text-violet-950 dark:text-violet-100"
                : "text-xs font-medium text-violet-950 dark:text-violet-100"
            }
          >
            Session: <span className="tabular-nums font-semibold">{formatClock(elapsedMs)}</span> (
            {(elapsedMs / 1000).toFixed(0)}s)
          </p>
          <label className={`mt-2 ${oLabel}`}>
            People reached out to
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={peopleInput}
              onChange={(e) => setPeopleInput(e.target.value)}
              className={oInput}
              placeholder="e.g. 5"
              autoFocus
            />
          </label>
          {formError ? (
            <p className="mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-300">{formError}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={submitSession}
              className={
                compact
                  ? "rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm hover:brightness-110"
                  : "rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110"
              }
            >
              {compact ? "Save" : "Save & update average"}
            </button>
            <button
              type="button"
              onClick={cancelReview}
              className={
                compact
                  ? "rounded-full border-2 border-zinc-300/90 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                  : "rounded-full border-2 border-zinc-300/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
              }
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={
          compact
            ? `mt-2 rounded-lg border-2 border-teal-200/80 bg-teal-50/40 p-2 dark:border-teal-700/40 dark:bg-teal-950/25 ${
                phase === "running" ? "opacity-60" : ""
              }`
            : `mt-2.5 rounded-xl border-2 border-teal-200/80 bg-teal-50/40 p-3 dark:border-teal-700/40 dark:bg-teal-950/25 ${
                phase === "running" ? "opacity-60" : ""
              }`
        }
      >
        <h3
          className={
            compact
              ? "text-[10px] font-bold text-teal-900 dark:text-teal-100"
              : "text-xs font-bold text-teal-900 dark:text-teal-100"
          }
        >
          Manual
        </h3>
        {!compact ? (
          <p className="mt-0.5 text-[10px] leading-snug text-teal-900/85 dark:text-teal-200/85">
            Same TPN totals if you forgot Start. Disabled while the live timer runs.
          </p>
        ) : (
          <p className="mt-0.5 text-[9px] leading-snug text-teal-900/85 dark:text-teal-200/85">
            Off while timer runs.
          </p>
        )}
        <div
          className={
            compact ? "mt-1.5 grid grid-cols-1 gap-1.5" : "mt-2 grid gap-2 sm:grid-cols-3"
          }
        >
          <label className={oLabel}>
            Hours
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
              className={oInput}
              placeholder="0"
              disabled={phase === "running"}
            />
          </label>
          <label className={oLabel}>
            Minutes
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              className={oInput}
              placeholder="30"
              disabled={phase === "running"}
            />
          </label>
          <label className={oLabel}>
            People reached
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={manualPeople}
              onChange={(e) => setManualPeople(e.target.value)}
              className={oInput}
              placeholder="e.g. 5"
              disabled={phase === "running"}
            />
          </label>
        </div>
        {manualError ? (
          <p className="mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-300">{manualError}</p>
        ) : null}
        <button
          type="button"
          onClick={submitManualSession}
          disabled={phase === "running"}
          className={
            compact
              ? "mt-1.5 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              : "mt-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {compact ? "Save manual" : "Save manual session"}
        </button>
      </div>
    </section>
  );
}
