"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  careershiftContactsSearchUrl,
  linkedinCompanySearchUrl,
} from "@/lib/external-search-urls";
import {
  DEFAULT_CONNECTION_THROUGH,
  type CompanyStartupStatus,
  type NetworkData,
  type PersonNetworkNode,
} from "@/lib/network-types";

const inputClass =
  "mt-1.5 w-full rounded-xl border-2 border-sky-200/90 bg-white/95 px-3 py-2.5 text-sm text-zinc-900 shadow-inner shadow-sky-100/40 outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:shadow-lg focus:shadow-violet-200/40 focus:ring-2 focus:ring-amber-200/80 dark:border-violet-500/35 dark:bg-zinc-950/85 dark:text-zinc-100 dark:shadow-none dark:placeholder:text-zinc-500 dark:focus:border-amber-400 dark:focus:shadow-fuchsia-900/30 dark:focus:ring-fuchsia-500/35";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-violet-800/90 dark:text-amber-200/90";

const optMuted = "font-normal lowercase text-sky-700/70 dark:text-sky-300/70";

/** Placeholder until you configure scoring rules */
export const PURPOSE_LIKABILITY_HINT =
  "How well this company fits your purpose and who you enjoy working with. You will be able to define rubric and weights here later.";

function FieldHint({ text }: { text: string }) {
  return (
    <span className="group/hint relative ml-1 inline-flex">
      <button
        type="button"
        className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-[11px] font-bold text-white shadow-md shadow-rose-400/30 outline-none ring-2 ring-white/50 transition hover:scale-110 hover:brightness-110 focus-visible:ring-4 focus-visible:ring-amber-300 dark:ring-violet-900/50"
        aria-label="Hint"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border-2 border-violet-200 bg-gradient-to-b from-white to-violet-50/80 px-3 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-violet-950 shadow-xl shadow-violet-300/30 group-focus-within/hint:visible group-hover/hint:visible dark:border-fuchsia-500/40 dark:from-zinc-900 dark:to-violet-950/80 dark:text-fuchsia-100 dark:shadow-fuchsia-900/40 sm:w-72"
      >
        {text}
      </span>
    </span>
  );
}

function companyIdForPerson(data: NetworkData, personId: string): string {
  const incoming = data.edges.filter((e) => e.target === personId);
  for (const e of incoming) {
    const n = data.nodes.find((x) => x.id === e.source);
    if (n?.kind === "company") return n.id;
  }
  return "";
}

function connectionThroughForPersonEdge(
  data: NetworkData,
  personId: string,
  companyId: string,
): string {
  const e = data.edges.find((x) => x.source === companyId && x.target === personId);
  return e?.connectionThrough ?? DEFAULT_CONNECTION_THROUGH;
}

function emptyCompanyForm() {
  return {
    label: "",
    website: "",
    country: "",
    purposeLikabilityMatch: "",
    description: "",
    startupStatus: "startup" as CompanyStartupStatus,
  };
}

function emptyPersonForm() {
  return {
    label: "",
    title: "",
    linkedinUrl: "",
    email: "",
    pennGrad: false,
    companyId: "",
    companyQuery: "",
    connectionThrough: DEFAULT_CONNECTION_THROUGH,
  };
}

function emptyPersonUpdateForm() {
  return {
    personId: "",
    label: "",
    title: "",
    linkedinUrl: "",
    pennGrad: false,
    companyId: "",
    companyQuery: "",
    connectionThrough: DEFAULT_CONNECTION_THROUGH,
    notes: "",
    funFacts: "",
    confidence: "",
    lastOutreachScore: "",
    lastOutreachAt: "",
    lastAttemptAt: "",
  };
}

type CollectTab = "company" | "person" | "update";

const COLLECT_TABS: { id: CollectTab; label: string; shortLabel: string }[] = [
  { id: "company", label: "Add company", shortLabel: "Company" },
  { id: "person", label: "Add person", shortLabel: "Person" },
  { id: "update", label: "Update after reply", shortLabel: "Update" },
];

export function CollectForms() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<CollectTab>("company");

  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [personForm, setPersonForm] = useState(emptyPersonForm);
  const [updateForm, setUpdateForm] = useState(emptyPersonUpdateForm);

  const [companyErr, setCompanyErr] = useState<string | null>(null);
  const [personErr, setPersonErr] = useState<string | null>(null);
  const [updateErr, setUpdateErr] = useState<string | null>(null);

  const [companyBusy, setCompanyBusy] = useState(false);
  const [personBusy, setPersonBusy] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);

  const [companyFlash, setCompanyFlash] = useState(false);
  const [personFlash, setPersonFlash] = useState(false);
  const [updateFlash, setUpdateFlash] = useState(false);
  const [companyResearchCopied, setCompanyResearchCopied] = useState(false);

  type ScrapeStatus =
    | { state: "idle" }
    | { state: "running"; companyName: string }
    | {
        state: "done";
        companyName: string;
        score: number | null;
        matchedCount: number;
        reason?: string;
      }
    | { state: "error"; companyName: string; reason: string };
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>({ state: "idle" });

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
      setLoadError(e instanceof Error ? e.message : "Failed to load network");
    }
  }, []);

  const runH1bScrape = useCallback(
    async (companyId: string, companyName: string) => {
      setScrapeStatus({ state: "running", companyName });
      try {
        const res = await fetch("/api/network/h1b-scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, companyName }),
        });
        if (!res.ok) {
          const text = await res.text();
          setScrapeStatus({
            state: "error",
            companyName,
            reason: text || `HTTP ${res.status}`,
          });
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          score?: number | null;
          matchedCount?: number;
          reason?: string;
        };
        setScrapeStatus({
          state: "done",
          companyName,
          score: typeof data.score === "number" ? data.score : null,
          matchedCount: typeof data.matchedCount === "number" ? data.matchedCount : 0,
          reason: data.reason,
        });
        await load();
      } catch (err) {
        setScrapeStatus({
          state: "error",
          companyName,
          reason: err instanceof Error ? err.message : "Network error",
        });
      }
    },
    [load],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const companies = useMemo(
    () => data?.nodes.filter((n) => n.kind === "company") ?? [],
    [data],
  );

  const people = useMemo(
    () =>
      (data?.nodes.filter((n): n is PersonNetworkNode => n.kind === "person") ?? []).sort(
        (a, b) => a.label.localeCompare(b.label),
      ),
    [data],
  );

  const filteredCompanies = useMemo(() => {
    const q = personForm.companyQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.label.toLowerCase().includes(q));
  }, [companies, personForm.companyQuery]);

  const filteredCompaniesUpdate = useMemo(() => {
    const q = updateForm.companyQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.label.toLowerCase().includes(q));
  }, [companies, updateForm.companyQuery]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border-2 border-rose-300/80 bg-gradient-to-br from-rose-50 to-amber-50 p-6 text-sm text-rose-950 shadow-lg shadow-rose-200/40 dark:border-rose-500/40 dark:from-rose-950/50 dark:to-amber-950/30 dark:text-rose-100 dark:shadow-rose-900/20">
        <p className="font-bold">Something glitched—we could not load your network.</p>
        <p className="mt-2 text-rose-900/90 dark:text-rose-200/90">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-110"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[200px] max-w-3xl items-center justify-center rounded-3xl border-2 border-dashed border-violet-300/70 bg-white/60 text-sm font-medium text-violet-700 shadow-inner dark:border-violet-500/40 dark:bg-zinc-900/50 dark:text-violet-200">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.1s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500" />
          <span className="ml-1">Warming up your forms…</span>
        </span>
      </div>
    );
  }

  const tabBtnBase =
    "shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 sm:px-4 dark:focus-visible:ring-offset-zinc-900";
  /* Light mode: dark text on soft fills (never white-on-white). Dark: light text on rich fills. */
  const tabActiveById: Record<CollectTab, string> = {
    company:
      "bg-gradient-to-br from-sky-100 to-cyan-200 text-sky-950 shadow-md ring-2 ring-sky-400/55 dark:from-sky-600 dark:to-indigo-800 dark:text-white dark:shadow-sky-900/30 dark:ring-sky-400/40",
    person:
      "bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-950 shadow-md ring-2 ring-emerald-400/55 dark:from-emerald-700 dark:to-teal-900 dark:text-white dark:shadow-emerald-900/25 dark:ring-emerald-400/40",
    update:
      "bg-gradient-to-br from-amber-100 to-rose-200 text-rose-950 shadow-md ring-2 ring-amber-400/55 dark:from-amber-600 dark:to-rose-800 dark:text-white dark:shadow-rose-900/25 dark:ring-amber-400/40",
  };
  const tabBtnInactive =
    "text-zinc-700 hover:bg-white/85 hover:text-violet-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-amber-50";

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="overflow-hidden rounded-3xl border-2 border-amber-200/70 bg-white/90 shadow-2xl shadow-amber-200/25 ring-1 ring-white/60 backdrop-blur-sm dark:border-violet-500/30 dark:bg-zinc-900/85 dark:shadow-violet-950/40 dark:ring-violet-500/10">
        <div
          role="tablist"
          aria-label="Collection form type"
          className="flex gap-1.5 overflow-x-auto border-b border-amber-200/50 bg-gradient-to-r from-sky-100/80 via-violet-100/70 to-amber-100/80 p-2.5 dark:border-violet-500/20 dark:from-violet-950/50 dark:via-fuchsia-950/35 dark:to-amber-950/25 sm:p-3"
        >
          {COLLECT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`collect-tab-${t.id}`}
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`${tabBtnBase} ${tab === t.id ? tabActiveById[t.id] : tabBtnInactive}`}
            >
              <span className="sm:hidden">{t.shortLabel}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Company */}
        <div
          role="tabpanel"
          id="collect-panel-company"
          aria-labelledby="collect-tab-company"
          hidden={tab !== "company"}
          className="p-5 sm:p-6"
        >
        <h2 className="text-lg font-bold text-sky-900 dark:text-sky-100">Add company</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Add identity, optional site, a quick &quot;do we vibe?&quot; score, and space for a fun fact.
        </p>
        {companyFlash ? (
          <p
            className="mt-3 rounded-xl border-2 border-sky-300/80 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3 text-sm font-semibold text-sky-950 shadow-md dark:border-sky-500/40 dark:from-sky-950/40 dark:to-cyan-950/30 dark:text-sky-100"
            role="status"
          >
            Nice — company saved. Onward.
          </p>
        ) : null}
        <form
          className="mt-5 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setCompanyBusy(true);
            setCompanyErr(null);
            setCompanyFlash(false);
            try {
              const matchRaw = companyForm.purposeLikabilityMatch.trim();
              const purposeLikabilityMatch =
                matchRaw === "" ? undefined : Number.parseInt(matchRaw, 10);
              const body: Record<string, unknown> = {
                kind: "company",
                label: companyForm.label,
                startupStatus: companyForm.startupStatus,
                website: companyForm.website.trim() || undefined,
                country: companyForm.country.trim() || undefined,
                description: companyForm.description.trim() || undefined,
              };
              if (
                typeof purposeLikabilityMatch === "number" &&
                !Number.isNaN(purposeLikabilityMatch)
              ) {
                body.purposeLikabilityMatch = purposeLikabilityMatch;
              }
              const res = await fetch("/api/network/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `HTTP ${res.status}`);
              }
              const saved = (await res.json().catch(() => null)) as
                | { id?: string }
                | null;
              const newCompanyId = typeof saved?.id === "string" ? saved.id : "";
              const newCompanyLabel = companyForm.label.trim();
              const wasEstablished = companyForm.startupStatus === "established";
              setCompanyForm(emptyCompanyForm());
              await load();
              setCompanyFlash(true);
              window.setTimeout(() => setCompanyFlash(false), 4000);
              if (newCompanyId) {
                setPersonForm((f) => ({
                  ...f,
                  companyId: newCompanyId,
                  companyQuery: newCompanyLabel,
                }));
                setTab("person");
              }
              if (newCompanyId && wasEstablished) {
                void runH1bScrape(newCompanyId, newCompanyLabel);
              }
            } catch (err) {
              setCompanyErr(err instanceof Error ? err.message : "Save failed");
            } finally {
              setCompanyBusy(false);
            }
          }}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Company name
                <input
                  required
                  value={companyForm.label}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, label: e.target.value }))}
                  className={inputClass}
                  autoComplete="organization"
                />
              </label>
              {companyForm.label.trim() ? (
                <div className="mt-3 rounded-xl border border-sky-200/70 bg-sky-50/50 px-3 py-2.5 dark:border-sky-900/50 dark:bg-sky-950/30">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-sky-900/90 dark:text-sky-200/90">
                    Research this company
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
                    CareerShift does not put the search in the URL—copy the name, open CareerShift, then
                    paste into their search field.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={linkedinCompanySearchUrl(companyForm.label.trim())}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 shadow-sm transition hover:border-sky-500 hover:bg-sky-50 dark:border-sky-700 dark:bg-zinc-900 dark:text-sky-100 dark:hover:bg-zinc-800"
                    >
                      LinkedIn companies
                    </a>
                    <span className="inline-flex items-center gap-1">
                      <a
                        href={careershiftContactsSearchUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border border-fuchsia-300 bg-white px-3 py-1.5 text-xs font-semibold text-fuchsia-900 shadow-sm transition hover:border-fuchsia-500 hover:bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-zinc-900 dark:text-fuchsia-100 dark:hover:bg-zinc-800"
                      >
                        Open CareerShift contacts
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          const t = companyForm.label.trim();
                          try {
                            await navigator.clipboard.writeText(t);
                            setCompanyResearchCopied(true);
                            window.setTimeout(() => setCompanyResearchCopied(false), 2500);
                          } catch {
                            setCompanyResearchCopied(false);
                          }
                        }}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-fuchsia-300 bg-white text-fuchsia-800 shadow-sm transition hover:border-fuchsia-500 hover:bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-zinc-900 dark:text-fuchsia-200 dark:hover:bg-zinc-800"
                        aria-label={companyResearchCopied ? "Copied" : "Copy company name"}
                        title={companyResearchCopied ? "Copied" : "Copy company name"}
                      >
                        {companyResearchCopied ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3.5 w-3.5"
                            aria-hidden
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3.5 w-3.5"
                            aria-hidden
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <label className={labelClass}>
              Country <span className={optMuted}>(optional)</span>
              <input
                value={companyForm.country}
                onChange={(e) => setCompanyForm((f) => ({ ...f, country: e.target.value }))}
                className={inputClass}
                placeholder="e.g. United States, India, Germany"
                autoComplete="country-name"
              />
            </label>
            <fieldset className={`sm:col-span-2 ${labelClass} space-y-2 border-0 p-0`}>
              <legend className="mb-0.5">Startup vs established</legend>
              <p className="mb-2 text-[11px] font-normal normal-case leading-snug text-zinc-600 dark:text-zinc-400">
                Used for future scoring and for the &quot;Startup vs established&quot; and &quot;Country&quot; graph clusters.
              </p>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:gap-8">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium normal-case text-zinc-800 dark:text-zinc-200">
                  <input
                    type="radio"
                    name="company-startup-status"
                    checked={companyForm.startupStatus === "startup"}
                    onChange={() =>
                      setCompanyForm((f) => ({ ...f, startupStatus: "startup" }))
                    }
                    className="border-violet-400 text-sky-600 focus:ring-amber-400"
                  />
                  Startup
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium normal-case text-zinc-800 dark:text-zinc-200">
                  <input
                    type="radio"
                    name="company-startup-status"
                    checked={companyForm.startupStatus === "established"}
                    onChange={() =>
                      setCompanyForm((f) => ({ ...f, startupStatus: "established" }))
                    }
                    className="border-violet-400 text-sky-600 focus:ring-amber-400"
                  />
                  Not a startup (established)
                </label>
              </div>
            </fieldset>
            <label className={`sm:col-span-2 ${labelClass}`}>
              Website <span className={optMuted}>(optional)</span>
              <input
                type="url"
                value={companyForm.website}
                onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))}
                className={inputClass}
                placeholder="https://"
              />
            </label>
            <label className={labelClass}>
              <span className="inline-flex flex-wrap items-center gap-0.5">
                Purpose / likability match
                <span className={`font-normal normal-case ${optMuted}`}>(optional, 1–5)</span>
                <FieldHint text={PURPOSE_LIKABILITY_HINT} />
              </span>
              <select
                value={companyForm.purposeLikabilityMatch}
                onChange={(e) =>
                  setCompanyForm((f) => ({ ...f, purposeLikabilityMatch: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Not set</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className={`sm:col-span-2 ${labelClass}`}>
              Fun fact or description <span className={optMuted}>(optional)</span>
              <textarea
                rows={3}
                value={companyForm.description}
                onChange={(e) =>
                  setCompanyForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          </div>
          {companyErr ? (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{companyErr}</p>
          ) : null}
          <div className="flex justify-end border-t border-amber-100/80 pt-4 dark:border-violet-800/50">
            <button
              type="submit"
              disabled={companyBusy}
              className="rounded-full bg-gradient-to-r from-sky-500 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-400/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {companyBusy ? "Saving…" : "Save company"}
            </button>
          </div>
        </form>
        </div>

      {/* Person add */}
        <div
          role="tabpanel"
          id="collect-panel-person"
          aria-labelledby="collect-tab-person"
          hidden={tab !== "person"}
          className="p-5 sm:p-6"
        >
        <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Add person</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Name, title, LinkedIn, optional email, then pick their company from your list—type to
          filter.
        </p>
        {scrapeStatus.state !== "idle" ? (
          <p
            className="mt-3 rounded-xl border-2 border-sky-200/80 bg-gradient-to-r from-sky-50 to-violet-50 px-4 py-2.5 text-xs font-medium text-sky-950 shadow-sm dark:border-sky-500/30 dark:from-sky-950/40 dark:to-violet-950/30 dark:text-sky-100"
            role="status"
          >
            {scrapeStatus.state === "running"
              ? `Computing intl score for ${scrapeStatus.companyName}…`
              : scrapeStatus.state === "done"
                ? scrapeStatus.score === null
                  ? `${scrapeStatus.companyName}: no H-1B match found${scrapeStatus.reason ? ` (${scrapeStatus.reason})` : ""}.`
                  : `${scrapeStatus.companyName} intl score: ${scrapeStatus.score} (matched ${scrapeStatus.matchedCount} employer ${scrapeStatus.matchedCount === 1 ? "entry" : "entries"})`
                : `Could not compute intl score for ${scrapeStatus.companyName}: ${scrapeStatus.reason}`}
          </p>
        ) : null}
        {personFlash ? (
          <p
            className="mt-3 rounded-xl border-2 border-emerald-300/80 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-md dark:border-emerald-500/40 dark:from-emerald-950/40 dark:to-teal-950/30 dark:text-emerald-100"
            role="status"
          >
            Yes — person saved. Your graph just got richer.
          </p>
        ) : null}
        <form
          className="mt-5 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPersonBusy(true);
            setPersonErr(null);
            setPersonFlash(false);
            try {
              const res = await fetch("/api/network/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  kind: "person",
                  label: personForm.label,
                  title: personForm.title.trim() || undefined,
                  linkedinUrl: personForm.linkedinUrl.trim() || undefined,
                  email: personForm.email.trim() || undefined,
                  companyId: personForm.companyId,
                  connectionThrough:
                    personForm.connectionThrough.trim() || DEFAULT_CONNECTION_THROUGH,
                  pennGrad: personForm.pennGrad,
                }),
              });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `HTTP ${res.status}`);
              }
              setPersonForm(emptyPersonForm());
              await load();
              setPersonFlash(true);
              window.setTimeout(() => setPersonFlash(false), 4000);
            } catch (err) {
              setPersonErr(err instanceof Error ? err.message : "Save failed");
            } finally {
              setPersonBusy(false);
            }
          }}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Full name
              <input
                required
                value={personForm.label}
                onChange={(e) => setPersonForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
                autoComplete="name"
              />
            </label>
            <label className={labelClass}>
              Title
              <input
                value={personForm.title}
                onChange={(e) => setPersonForm((f) => ({ ...f, title: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className={`sm:col-span-2 ${labelClass}`}>
              LinkedIn URL
              <input
                type="url"
                value={personForm.linkedinUrl}
                onChange={(e) => setPersonForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                className={inputClass}
                placeholder="https://www.linkedin.com/in/…"
              />
            </label>
            <label className={`sm:col-span-2 ${labelClass}`}>
              Email <span className={optMuted}>(optional)</span>
              <input
                type="email"
                value={personForm.email}
                onChange={(e) => setPersonForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
                autoComplete="email"
                placeholder="name@company.com"
              />
            </label>
            <label className={`flex cursor-pointer items-start gap-3 sm:col-span-2 ${labelClass}`}>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-fuchsia-300 text-fuchsia-600 focus:ring-fuchsia-500 dark:border-fuchsia-600 dark:bg-zinc-900"
                checked={personForm.pennGrad}
                onChange={(e) => setPersonForm((f) => ({ ...f, pennGrad: e.target.checked }))}
              />
              <span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Penn grad</span>
                <span className="mt-0.5 block text-[11px] font-normal normal-case leading-snug text-zinc-600 dark:text-zinc-400">
                  University of Pennsylvania (any school). Adds a fixed bonus on the outreach queue
                  (not a toggleable score factor).
                </span>
              </span>
            </label>
            <label className={`sm:col-span-2 ${labelClass}`}>
              Connection through
              <span className="mb-1.5 mt-0.5 block text-[11px] font-normal normal-case leading-snug text-zinc-600 dark:text-zinc-400">
                Defaults to cold outreach. Set a warm path (intro, alumni, event, etc.) when it
                applies—this is stored on the link to their company and shown on the graph.
              </span>
              <input
                value={personForm.connectionThrough}
                onChange={(e) =>
                  setPersonForm((f) => ({ ...f, connectionThrough: e.target.value }))
                }
                className={inputClass}
                placeholder={DEFAULT_CONNECTION_THROUGH}
              />
            </label>
            <div className={`sm:col-span-2 ${labelClass}`}>
              <span>Company</span>
              <input
                value={personForm.companyQuery}
                onChange={(e) =>
                  setPersonForm((f) => ({ ...f, companyQuery: e.target.value }))
                }
                className={inputClass}
                placeholder="Type to filter companies…"
                aria-label="Filter companies"
              />
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border-2 border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/40 dark:border-emerald-500/25 dark:from-zinc-950 dark:to-emerald-950/20">
                {filteredCompanies.length === 0 ? (
                  <p className="p-3 text-sm font-medium text-emerald-800/80 dark:text-emerald-200/80">
                    No matches yet—add a company in the first tab, then come back.
                  </p>
                ) : (
                  <ul className="divide-y divide-emerald-100/80 dark:divide-emerald-900/40">
                    {filteredCompanies.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30">
                          <input
                            type="radio"
                            name="person-company"
                            value={c.id}
                            checked={personForm.companyId === c.id}
                            onChange={() =>
                              setPersonForm((f) => ({
                                ...f,
                                companyId: c.id,
                                companyQuery: c.label,
                              }))
                            }
                            className="border-emerald-300 text-emerald-600 focus:ring-2 focus:ring-amber-400 dark:border-emerald-500 dark:text-teal-400"
                          />
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {c.label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          {personErr ? (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{personErr}</p>
          ) : null}
          <div className="flex justify-end border-t border-amber-100/80 pt-4 dark:border-violet-800/50">
            <button
              type="submit"
              disabled={personBusy || companies.length === 0 || !personForm.companyId}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-400/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {personBusy ? "Saving…" : "Save person"}
            </button>
          </div>
        </form>
        </div>

      {/* Person replied — update */}
        <div
          role="tabpanel"
          id="collect-panel-update"
          aria-labelledby="collect-tab-update"
          hidden={tab !== "update"}
          className="p-5 sm:p-6"
        >
        <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">
          Update after they reply
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          A reply is a win—capture what you learned, how confident you feel, and how the outreach
          felt.
        </p>
        {updateFlash ? (
          <p
            className="mt-3 rounded-xl border-2 border-amber-300/90 bg-gradient-to-r from-amber-50 to-rose-50 px-4 py-3 text-sm font-semibold text-amber-950 shadow-md dark:border-amber-500/40 dark:from-amber-950/40 dark:to-rose-950/35 dark:text-amber-100"
            role="status"
          >
            Updated — nice follow-through.
          </p>
        ) : null}
        <form
          className="mt-5 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!updateForm.personId || !updateForm.companyId) {
              setUpdateErr("Choose a person and company.");
              return;
            }
            setUpdateBusy(true);
            setUpdateErr(null);
            setUpdateFlash(false);
            try {
              const res = await fetch("/api/network/person/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  personId: updateForm.personId,
                  label: updateForm.label,
                  title: updateForm.title.trim() || undefined,
                  linkedinUrl: updateForm.linkedinUrl.trim() || undefined,
                  companyId: updateForm.companyId,
                  connectionThrough:
                    updateForm.connectionThrough.trim() || DEFAULT_CONNECTION_THROUGH,
                  notes: updateForm.notes,
                  funFacts: updateForm.funFacts,
                  confidence: updateForm.confidence.trim() || undefined,
                  lastOutreachScore: updateForm.lastOutreachScore.trim() || undefined,
                  lastOutreachAt: updateForm.lastOutreachAt.trim() || undefined,
                  lastAttemptAt: updateForm.lastAttemptAt.trim() || undefined,
                  pennGrad: updateForm.pennGrad,
                }),
              });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `HTTP ${res.status}`);
              }
              await load();
              setUpdateFlash(true);
              window.setTimeout(() => setUpdateFlash(false), 4000);
            } catch (err) {
              setUpdateErr(err instanceof Error ? err.message : "Update failed");
            } finally {
              setUpdateBusy(false);
            }
          }}
        >
          <label className={labelClass}>
            Person
            <select
              required
              value={updateForm.personId}
              onChange={(e) => {
                const id = e.target.value;
                const p = people.find((x) => x.id === id);
                const coId = data && id ? companyIdForPerson(data, id) : "";
                const co = companies.find((c) => c.id === coId);
                setUpdateForm({
                  ...emptyPersonUpdateForm(),
                  personId: id,
                  label: p?.label ?? "",
                  title: p?.title ?? "",
                  linkedinUrl: p?.linkedinUrl ?? "",
                  companyId: coId,
                  companyQuery: co?.label ?? "",
                  connectionThrough:
                    id && coId
                      ? connectionThroughForPersonEdge(data, id, coId)
                      : DEFAULT_CONNECTION_THROUGH,
                  notes: p?.notes ?? "",
                  funFacts: p?.funFacts ?? "",
                  confidence:
                    typeof p?.confidence === "number" && Number.isFinite(p.confidence)
                      ? String(p.confidence)
                      : "",
                  lastOutreachScore:
                    typeof p?.lastOutreachScore === "number" &&
                    Number.isFinite(p.lastOutreachScore)
                      ? String(p.lastOutreachScore)
                      : "",
                  lastOutreachAt: p?.lastOutreachAt?.slice(0, 10) ?? "",
                  lastAttemptAt: p?.lastAttemptAt?.slice(0, 10) ?? "",
                  pennGrad: p?.pennGrad === true,
                });
              }}
              className={inputClass}
            >
              <option value="">Select person…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.title ? ` — ${p.title}` : ""}
                </option>
              ))}
            </select>
          </label>

          {updateForm.personId ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Full name
                  <input
                    required
                    value={updateForm.label}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, label: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Title
                  <input
                    value={updateForm.title}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, title: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className={`sm:col-span-2 ${labelClass}`}>
                  LinkedIn URL
                  <input
                    type="url"
                    value={updateForm.linkedinUrl}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, linkedinUrl: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
                <label className={`flex cursor-pointer items-start gap-3 sm:col-span-2 ${labelClass}`}>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-fuchsia-300 text-fuchsia-600 focus:ring-fuchsia-500 dark:border-fuchsia-600 dark:bg-zinc-900"
                    checked={updateForm.pennGrad}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, pennGrad: e.target.checked }))
                    }
                  />
                  <span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">Penn grad</span>
                    <span className="mt-0.5 block text-[11px] font-normal normal-case leading-snug text-zinc-600 dark:text-zinc-400">
                      UPenn alum — fixed outreach queue bonus when checked.
                    </span>
                  </span>
                </label>
              </div>

              <div className={labelClass}>
                <span>Company</span>
                <input
                  value={updateForm.companyQuery}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, companyQuery: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="Filter companies…"
                  aria-label="Filter companies for update"
                />
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border-2 border-amber-200/70 bg-gradient-to-b from-white to-amber-50/35 dark:border-amber-500/25 dark:from-zinc-950 dark:to-amber-950/20">
                  <ul className="divide-y divide-amber-100/90 dark:divide-amber-900/35">
                    {filteredCompaniesUpdate.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-amber-100/50 dark:hover:bg-amber-900/25">
                          <input
                            type="radio"
                            name="update-person-company"
                            value={c.id}
                            checked={updateForm.companyId === c.id}
                            onChange={() =>
                              setUpdateForm((f) => ({
                                ...f,
                                companyId: c.id,
                                companyQuery: c.label,
                                connectionThrough: connectionThroughForPersonEdge(
                                  data,
                                  f.personId,
                                  c.id,
                                ),
                              }))
                            }
                            className="border-amber-300 text-rose-600 focus:ring-2 focus:ring-amber-400 dark:border-amber-500 dark:text-rose-400"
                          />
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {c.label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <label className={labelClass}>
                Connection through
                <span className="mb-1.5 mt-0.5 block text-[11px] font-normal normal-case leading-snug text-zinc-600 dark:text-zinc-400">
                  How you know them at this company (shown on the graph on the link to their
                  employer).
                </span>
                <input
                  value={updateForm.connectionThrough}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, connectionThrough: e.target.value }))
                  }
                  className={inputClass}
                  placeholder={DEFAULT_CONNECTION_THROUGH}
                />
              </label>

              <label className={labelClass}>
                Fun facts
                <textarea
                  rows={3}
                  value={updateForm.funFacts}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, funFacts: e.target.value }))}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Notes (reach / verification)
                <textarea
                  rows={2}
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, notes: e.target.value }))}
                  className={inputClass}
                />
              </label>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Confidence (0–1)
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={updateForm.confidence}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, confidence: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="e.g. 0.85"
                  />
                </label>
                <label className={labelClass}>
                  Last outreach score (0–10)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    value={updateForm.lastOutreachScore}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, lastOutreachScore: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Last outreach date
                  <input
                    type="date"
                    value={updateForm.lastOutreachAt}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, lastOutreachAt: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Last attempt date
                  <input
                    type="date"
                    value={updateForm.lastAttemptAt}
                    onChange={(e) =>
                      setUpdateForm((f) => ({ ...f, lastAttemptAt: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </>
          ) : null}

          {updateErr ? (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{updateErr}</p>
          ) : null}

          <div className="flex justify-end border-t border-amber-100/80 pt-4 dark:border-violet-800/50">
            <button
              type="submit"
              disabled={
                updateBusy ||
                people.length === 0 ||
                !updateForm.personId ||
                !updateForm.companyId
              }
              className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-400/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateBusy ? "Saving…" : "Save updates"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
