"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  INDUSTRY_OTHER_VALUE,
  INDUSTRY_PRESET_LABELS,
  resolveIndustryFromForm,
} from "@/lib/industry-options";
import type { CapturePayload } from "@/lib/pending-capture-ingest";
import {
  DEFAULT_CONNECTION_THROUGH,
  type CompanyStartupStatus,
  type NetworkData,
} from "@/lib/network-types";
import { confirmCapture, dismissCapture } from "@/app/collect/inbox/actions";

const inputClass =
  "mt-1.5 w-full rounded-xl border-2 border-sky-200/90 bg-white/95 px-3 py-2.5 text-sm text-zinc-900 shadow-inner shadow-sky-100/40 outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:shadow-lg focus:shadow-violet-200/40 focus:ring-2 focus:ring-amber-200/80 dark:border-violet-500/35 dark:bg-zinc-950/85 dark:text-zinc-100 dark:shadow-none dark:placeholder:text-zinc-500 dark:focus:border-amber-400 dark:focus:shadow-fuchsia-900/30 dark:focus:ring-fuchsia-500/35";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-violet-800/90 dark:text-amber-200/90";

const optMuted = "font-normal lowercase text-sky-700/70 dark:text-sky-300/70";

export type SerializedPendingCapture = {
  id: string;
  createdAt: string;
  sourceUrl: string;
  pageKind: string;
  suggestedKind: string;
  payload: CapturePayload;
};

function normalizeWebsite(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function defaultStartupForCapture(pageKind: string): CompanyStartupStatus {
  return pageKind === "yc_company" || pageKind === "yc_jobs" ? "startup" : "established";
}

function defaultKindTab(suggested: string): "company" | "person" {
  if (suggested === "person") return "person";
  return "company";
}

export function CollectInboxClient({
  initialCaptures,
}: {
  initialCaptures: SerializedPendingCapture[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onDismiss = useCallback(
    (id: string) => {
      setMessage(null);
      startTransition(async () => {
        const res = await dismissCapture(id);
        if ("error" in res) {
          setMessage(res.error);
          return;
        }
        if (activeId === id) setActiveId(null);
        router.refresh();
      });
    },
    [activeId, router],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Saves from the browser extension land here. Confirm when you have energy—nothing hits your graph
        until you do.
      </p>
      {message ? (
        <p
          className="rounded-xl border-2 border-rose-300/80 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          {message}
        </p>
      ) : null}
      {initialCaptures.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-violet-200/80 bg-white/60 px-6 py-10 text-center text-sm font-medium text-violet-900/80 dark:border-violet-600/40 dark:bg-zinc-900/50 dark:text-violet-100/90">
          Inbox is empty. Use the extension on a YC page, then refresh this tab.
        </p>
      ) : (
        <ul className="space-y-4">
          {initialCaptures.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border-2 border-violet-200/70 bg-white/90 p-4 shadow-md shadow-violet-200/20 dark:border-violet-600/35 dark:bg-zinc-900/70 dark:shadow-none"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {c.payload.label?.trim() || "Untitled capture"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {c.suggestedKind} · {c.pageKind} · {c.createdAt}
                  </p>
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block truncate text-xs font-semibold text-sky-700 underline decoration-sky-400/60 underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
                  >
                    {c.sourceUrl}
                  </a>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onDismiss(c.id)}
                    className="rounded-full border-2 border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setMessage(null);
                      setActiveId((id) => (id === c.id ? null : c.id));
                    }}
                    className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
                  >
                    {activeId === c.id ? "Hide form" : "Review & confirm"}
                  </button>
                </div>
              </div>
              {activeId === c.id ? (
                <CaptureConfirmForm
                  key={c.id}
                  capture={c}
                  disabled={isPending}
                  onCancel={() => setActiveId(null)}
                  onConfirmed={() => {
                    setActiveId(null);
                    router.refresh();
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-center text-sm">
        <Link
          href="/collect"
          className="font-semibold text-violet-700 underline decoration-violet-400/60 underline-offset-2 hover:text-violet-950 dark:text-amber-200 dark:hover:text-amber-50"
        >
          Back to data collection
        </Link>
      </p>
    </div>
  );
}

function CaptureConfirmForm({
  capture,
  disabled,
  onCancel,
  onConfirmed,
}: {
  capture: SerializedPendingCapture;
  disabled: boolean;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"company" | "person">(() =>
    defaultKindTab(capture.suggestedKind),
  );
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkData | null>(null);

  const companies = useMemo(() => {
    if (!network) return [];
    return network.nodes.filter((n) => n.kind === "company").map((n) => ({ id: n.id, label: n.label }));
  }, [network]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/network", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as NetworkData;
        if (!cancelled) setNetwork(json);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [companyForm, setCompanyForm] = useState({
    label: capture.payload.label?.trim() ?? "",
    industryPreset: "",
    industryOther: "",
    website: normalizeWebsite(capture.payload.website?.trim() ?? "") ?? "",
    country: "",
    description: capture.payload.description?.trim() ?? "",
    startupStatus: defaultStartupForCapture(capture.pageKind),
    purposeLikabilityMatch: "",
  });

  const [personForm, setPersonForm] = useState({
    label: capture.payload.label?.trim() ?? "",
    title: capture.payload.title?.trim() ?? "",
    linkedinUrl: "",
    email: "",
    pennGrad: false,
    companyId: "",
    companyQuery: capture.payload.suggestedCompanyLabel?.trim() ?? "",
    connectionThrough: DEFAULT_CONNECTION_THROUGH,
  });

  const filteredCompanies = useMemo(() => {
    const q = personForm.companyQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.label.toLowerCase().includes(q));
  }, [companies, personForm.companyQuery]);

  const submitCompany = async () => {
    setLocalErr(null);
    const resolved = resolveIndustryFromForm(companyForm.industryPreset, companyForm.industryOther);
    if ("error" in resolved) {
      setLocalErr(resolved.error);
      return;
    }
    const matchRaw = companyForm.purposeLikabilityMatch.trim();
    const purposeLikabilityMatch =
      matchRaw === "" ? undefined : Number.parseInt(matchRaw, 10);
    const website = normalizeWebsite(companyForm.website) ?? "";
    const body: Record<string, unknown> = {
      kind: "company",
      label: companyForm.label.trim(),
      industry: resolved.industry,
      startupStatus: companyForm.startupStatus,
      website: website || undefined,
      country: companyForm.country.trim() || undefined,
      description: companyForm.description.trim() || undefined,
      sourceUrl: capture.sourceUrl,
      sourceType: "browser_extension",
      rawExtract: capture.payload.rawExtract,
      confidence: capture.payload.confidence,
    };
    if (typeof purposeLikabilityMatch === "number" && !Number.isNaN(purposeLikabilityMatch)) {
      body.purposeLikabilityMatch = purposeLikabilityMatch;
    }
    setBusy(true);
    try {
      const res = await confirmCapture(capture.id, JSON.stringify(body));
      if ("error" in res) {
        setLocalErr(res.error);
        return;
      }
      onConfirmed();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const submitPerson = async () => {
    setLocalErr(null);
    if (!personForm.companyId) {
      setLocalErr("Choose a company for this person.");
      return;
    }
    const body = {
      kind: "person" as const,
      label: personForm.label.trim(),
      title: personForm.title.trim() || undefined,
      linkedinUrl: personForm.linkedinUrl.trim() || undefined,
      email: personForm.email.trim() || undefined,
      companyId: personForm.companyId,
      connectionThrough: personForm.connectionThrough.trim() || DEFAULT_CONNECTION_THROUGH,
      pennGrad: personForm.pennGrad,
      sourceUrl: capture.sourceUrl,
      sourceType: "browser_extension",
      rawExtract: capture.payload.rawExtract,
      confidence: capture.payload.confidence,
    };
    setBusy(true);
    try {
      const res = await confirmCapture(capture.id, JSON.stringify(body));
      if ("error" in res) {
        setLocalErr(res.error);
        return;
      }
      onConfirmed();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-violet-200/60 pt-4 dark:border-violet-800/40">
      {localErr ? (
        <p className="mb-3 rounded-lg border border-rose-300/80 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-600/50 dark:bg-rose-950/50 dark:text-rose-100">
          {localErr}
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("company")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            tab === "company"
              ? "bg-sky-600 text-white shadow-md"
              : "border border-sky-300/80 bg-white text-sky-900 dark:border-sky-700 dark:bg-zinc-800 dark:text-sky-100"
          }`}
        >
          Save as company
        </button>
        <button
          type="button"
          onClick={() => setTab("person")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            tab === "person"
              ? "bg-emerald-600 text-white shadow-md"
              : "border border-emerald-300/80 bg-white text-emerald-900 dark:border-emerald-700 dark:bg-zinc-800 dark:text-emerald-100"
          }`}
        >
          Save as person
        </button>
      </div>

      {tab === "company" ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submitCompany();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Company name
              <input
                required
                value={companyForm.label}
                onChange={(e) => setCompanyForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Industry
              <select
                required
                value={companyForm.industryPreset}
                onChange={(e) =>
                  setCompanyForm((f) => ({
                    ...f,
                    industryPreset: e.target.value,
                    ...(e.target.value !== INDUSTRY_OTHER_VALUE ? { industryOther: "" } : {}),
                  }))
                }
                className={inputClass}
              >
                <option value="">Select industry…</option>
                {INDUSTRY_PRESET_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
                <option value={INDUSTRY_OTHER_VALUE}>Other (specify)</option>
              </select>
            </label>
            {companyForm.industryPreset === INDUSTRY_OTHER_VALUE ? (
              <label className={`sm:col-span-2 ${labelClass}`}>
                Industry (custom)
                <input
                  required
                  value={companyForm.industryOther}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, industryOther: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            ) : null}
            <label className={labelClass}>
              Country <span className={optMuted}>(optional)</span>
              <input
                value={companyForm.country}
                onChange={(e) => setCompanyForm((f) => ({ ...f, country: e.target.value }))}
                className={inputClass}
                placeholder="e.g. United States, India"
                autoComplete="country-name"
              />
            </label>
            <fieldset className={`sm:col-span-2 ${labelClass} space-y-2 border-0 p-0`}>
              <legend className="mb-1">Startup vs established</legend>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:gap-8">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium normal-case">
                  <input
                    type="radio"
                    checked={companyForm.startupStatus === "startup"}
                    onChange={() =>
                      setCompanyForm((f) => ({ ...f, startupStatus: "startup" }))
                    }
                  />
                  Startup
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium normal-case">
                  <input
                    type="radio"
                    checked={companyForm.startupStatus === "established"}
                    onChange={() =>
                      setCompanyForm((f) => ({ ...f, startupStatus: "established" }))
                    }
                  />
                  Established
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
              Purpose / likability <span className={optMuted}>(optional 1–5)</span>
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
              Description <span className={optMuted}>(optional)</span>
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
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy || disabled}
              className="rounded-full border-2 border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || disabled}
              className="rounded-full bg-gradient-to-r from-sky-500 to-violet-600 px-5 py-2 text-sm font-bold text-white shadow-lg disabled:opacity-50"
            >
              {busy ? "Saving…" : "Confirm & add company"}
            </button>
          </div>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submitPerson();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Full name
              <input
                required
                value={personForm.label}
                onChange={(e) => setPersonForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
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
              LinkedIn URL <span className={optMuted}>(optional)</span>
              <input
                type="url"
                value={personForm.linkedinUrl}
                onChange={(e) =>
                  setPersonForm((f) => ({ ...f, linkedinUrl: e.target.value }))
                }
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
              />
            </label>
            <label className={`flex cursor-pointer items-start gap-3 sm:col-span-2 ${labelClass}`}>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-fuchsia-300 text-fuchsia-600 dark:border-fuchsia-600 dark:bg-zinc-900"
                checked={personForm.pennGrad}
                onChange={(e) => setPersonForm((f) => ({ ...f, pennGrad: e.target.checked }))}
              />
              <span className="font-semibold normal-case text-zinc-900 dark:text-zinc-100">
                Penn grad
              </span>
            </label>
            <label className={`sm:col-span-2 ${labelClass}`}>
              Connection through
              <input
                value={personForm.connectionThrough}
                onChange={(e) =>
                  setPersonForm((f) => ({ ...f, connectionThrough: e.target.value }))
                }
                className={inputClass}
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
              />
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border-2 border-emerald-200/70 bg-white dark:border-emerald-700/50 dark:bg-zinc-950/80">
                {filteredCompanies.length === 0 ? (
                  <p className="p-3 text-sm text-emerald-900 dark:text-emerald-100">
                    No companies match. Add a company from the main collect page first.
                  </p>
                ) : (
                  <ul className="divide-y divide-emerald-100 dark:divide-emerald-900/40">
                    {filteredCompanies.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                          <input
                            type="radio"
                            name={`company-${capture.id}`}
                            checked={personForm.companyId === c.id}
                            onChange={() =>
                              setPersonForm((f) => ({
                                ...f,
                                companyId: c.id,
                                companyQuery: c.label,
                              }))
                            }
                          />
                          <span>{c.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy || disabled}
              className="rounded-full border-2 border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || disabled || companies.length === 0 || !personForm.companyId}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-bold text-white shadow-lg disabled:opacity-50"
            >
              {busy ? "Saving…" : "Confirm & add person"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
