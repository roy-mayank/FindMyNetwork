"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";

import { listEmailDraftsAction } from "@/app/actions/network";
import {
  OUTREACH_FACTORS,
  allOutreachFactorIds,
  connectionThroughForPersonEmployer,
  type OutreachRankRow,
} from "@/lib/outreach-heuristic";
import type { CompanyNetworkNode, EmailDraft, NetworkData } from "@/lib/network-types";

type OutreachPersonDetailModalProps = {
  open: boolean;
  row: OutreachRankRow | null;
  network: NetworkData | null;
  onLater: () => void;
  onComplete: () => void | Promise<void>;
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === "") return null;
  return (
    <div className="text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      <div className="mt-0.5 whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">{children}</div>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  const t = href.trim();
  if (!t) return null;
  return (
    <div className="text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      <div className="mt-0.5">
        <a
          href={t}
          target="_blank"
          rel="noreferrer"
          className="break-all text-fuchsia-700 underline-offset-2 hover:underline dark:text-fuchsia-300"
        >
          {t}
        </a>
      </div>
    </div>
  );
}

function companyDetailRows(employer: CompanyNetworkNode) {
  return (
    <>
      {employer.subtitle ? <DetailRow label="Subtitle">{employer.subtitle}</DetailRow> : null}
      {employer.website ? <LinkRow label="Website" href={employer.website} /> : null}
      {employer.fundingSummary ? <DetailRow label="Funding">{employer.fundingSummary}</DetailRow> : null}
      {employer.description ? <DetailRow label="About">{employer.description}</DetailRow> : null}
      {typeof employer.internationalHiringScore === "number" && Number.isFinite(employer.internationalHiringScore) ? (
        <DetailRow label="Intl hiring score (company)">{String(employer.internationalHiringScore)}</DetailRow>
      ) : null}
      {employer.hiringSignalsSummary ? (
        <DetailRow label="Hiring signals (company)">{employer.hiringSignalsSummary}</DetailRow>
      ) : null}
    </>
  );
}

export function OutreachPersonDetailModal({
  open,
  row,
  network,
  onLater,
  onComplete,
}: OutreachPersonDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [isCompleting, startComplete] = useTransition();

  useEffect(() => {
    if (!open || !row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, row, onLater]);

  useEffect(() => {
    let cancelled = false;
    if (!open || !row) {
      setDrafts([]);
      setDraftsError(null);
      return;
    }
    queueMicrotask(() => {
      void (async () => {
        try {
          const rows = await listEmailDraftsAction(row.person.id);
          if (!cancelled) {
            setDrafts(rows);
            setDraftsError(null);
          }
        } catch {
          if (!cancelled) {
            setDrafts([]);
            setDraftsError("Could not load email drafts.");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [open, row]);

  useEffect(() => {
    if (!open || !row) return;
    const root = panelRef.current;
    if (!root) return;
    const focusable = root.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [open, row]);

  if (!open || !row) return null;

  const p = row.person;
  const employer = row.primaryEmployer;
  const connectionThrough =
    network && employer
      ? connectionThroughForPersonEmployer(network, p.id, employer.id)
      : undefined;

  const intlPerson =
    typeof p.internationalHiringScore === "number" && Number.isFinite(p.internationalHiringScore)
      ? p.internationalHiringScore
      : null;
  const intlEmployer =
    employer &&
    typeof employer.internationalHiringScore === "number" &&
    Number.isFinite(employer.internationalHiringScore)
      ? employer.internationalHiringScore
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onLater();
      }}
    >
      <div className="absolute inset-0 bg-violet-950/45 backdrop-blur-[2px] dark:bg-black/55" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outreach-person-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-fuchsia-200/70 bg-gradient-to-b from-white via-white to-violet-50/40 shadow-2xl shadow-fuchsia-200/20 ring-1 ring-white/70 dark:border-violet-500/35 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/40 dark:shadow-violet-950/40 dark:ring-violet-500/15"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-800 dark:text-fuchsia-200/90">
                Person
              </p>
              <h2
                id="outreach-person-title"
                className="mt-1 bg-gradient-to-r from-violet-700 to-fuchsia-700 bg-clip-text text-xl font-bold text-transparent dark:from-sky-200 dark:to-amber-200"
              >
                {p.label}
              </h2>
              {p.title ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{p.title}</p> : null}
              <p className="mt-2 text-lg font-bold tabular-nums text-violet-700 dark:text-violet-300">
                {row.total}
                <span className="ml-1 text-xs font-medium text-zinc-500">outreach score</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {allOutreachFactorIds()
                  .filter((id) => id in row.breakdown)
                  .map((id) => {
                    const v = row.breakdown[id];
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
            </div>
          </div>

          {employer ? (
            <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Primary employer
              </p>
              <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{employer.label}</p>
              {connectionThrough ? (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">Connection:</span>{" "}
                  {connectionThrough}
                </p>
              ) : null}
              <div className="mt-3 space-y-3">{companyDetailRows(employer)}</div>
            </section>
          ) : null}

          <section className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Contact &amp; profiles
            </p>
            {p.email ? <DetailRow label="Email">{p.email}</DetailRow> : null}
            {p.secondaryEmail ? <DetailRow label="Secondary email">{p.secondaryEmail}</DetailRow> : null}
            {p.linkedinUrl ? <LinkRow label="LinkedIn" href={p.linkedinUrl} /> : null}
            {p.alumniUrl ? <LinkRow label="Alumni" href={p.alumniUrl} /> : null}
            {p.directoryProfileUrl ? <LinkRow label="Directory profile" href={p.directoryProfileUrl} /> : null}
            {p.verificationStatus ? (
              <DetailRow label="Email verification">{p.verificationStatus}</DetailRow>
            ) : null}
          </section>

          <section className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Outreach context
            </p>
            {p.lastOutreachAt ? <DetailRow label="Last outreach (reached)">{p.lastOutreachAt}</DetailRow> : null}
            {p.lastAttemptAt ? <DetailRow label="Last attempt">{p.lastAttemptAt}</DetailRow> : null}
            {typeof p.lastOutreachScore === "number" ? (
              <DetailRow label="Last outreach score">{String(p.lastOutreachScore)}</DetailRow>
            ) : null}
            {p.funFacts ? <DetailRow label="Fun facts">{p.funFacts}</DetailRow> : null}
            {p.notes ? <DetailRow label="Notes">{p.notes}</DetailRow> : null}
          </section>

          <section className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Hiring signals
            </p>
            {intlPerson != null ? <DetailRow label="Intl hiring score (person)">{String(intlPerson)}</DetailRow> : null}
            {p.hiringSignalsSummary ? (
              <DetailRow label="Hiring signals (person)">{p.hiringSignalsSummary}</DetailRow>
            ) : null}
            {intlPerson == null && intlEmployer != null ? (
              <DetailRow label="Intl hiring score (via employer)">{String(intlEmployer)}</DetailRow>
            ) : null}
            {intlPerson == null && !p.hiringSignalsSummary && employer?.hiringSignalsSummary ? (
              <DetailRow label="Hiring signals (via employer)">{employer.hiringSignalsSummary}</DetailRow>
            ) : null}
          </section>

          <section className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Source &amp; extraction
            </p>
            {p.enrichmentStatus ? <DetailRow label="Enrichment">{p.enrichmentStatus}</DetailRow> : null}
            {p.sourceType ? <DetailRow label="Source type">{p.sourceType}</DetailRow> : null}
            {p.sourceUrl ? <LinkRow label="Source URL" href={p.sourceUrl} /> : null}
            {typeof p.confidence === "number" ? <DetailRow label="Confidence">{String(p.confidence)}</DetailRow> : null}
            {p.rawExtract ? (
              <DetailRow label="Raw extract">
                {p.rawExtract.length > 4000 ? `${p.rawExtract.slice(0, 4000)}…` : p.rawExtract}
              </DetailRow>
            ) : null}
          </section>

          <section className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Saved email drafts
            </p>
            {draftsError ? (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{draftsError}</p>
            ) : drafts.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                No drafts yet. Generate them from the graph view for this person.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {drafts.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-900/70"
                  >
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                      {d.draftType.replace("_", " ")} — {d.subject}
                    </p>
                    <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">
                      {d.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-zinc-200 bg-white/95 p-4 dark:border-zinc-700 dark:bg-zinc-900/95">
          {completeError ? (
            <p className="mb-3 text-center text-xs text-rose-600 dark:text-rose-400">{completeError}</p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isCompleting}
              onClick={onLater}
              className="rounded-full border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Later
            </button>
            <button
              type="button"
              disabled={isCompleting}
              onClick={() => {
                setCompleteError(null);
                startComplete(async () => {
                  try {
                    await onComplete();
                  } catch (e) {
                    setCompleteError(e instanceof Error ? e.message : "Could not save.");
                  }
                });
              }}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-400/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {isCompleting ? "Saving…" : "Complete"}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
            Complete sets last outreach to today and hides this person here until the next day (UTC). Later closes
            with no changes.
          </p>
        </div>
      </div>
    </div>
  );
}
