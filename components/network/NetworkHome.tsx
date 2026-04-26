"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { NetworkCanvas } from "@/components/network/NetworkCanvas";
import type { NetworkData } from "@/lib/network-types";

export function NetworkHome() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [kind, setKind] = useState<"company" | "person">("person");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    label: "",
    subtitle: "",
    website: "",
    companyId: "",
    title: "",
    linkedinUrl: "",
    alumniUrl: "",
    lastReachedAt: "",
    lastAttemptAt: "",
    notes: "",
    sourceUrl: "",
    sourceType: "linkedin",
    confidence: "0.8",
    rawExtract: "",
  });

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

  const companies = useMemo(
    () => data?.nodes.filter((n) => n.kind === "company") ?? [],
    [data],
  );

  const selectedCompanyId = form.companyId || companies[0]?.id || "";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setSubmitError(null);
            setAddOpen(true);
          }}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add item
        </button>
      </div>
      <NetworkCanvas data={data} onNetworkUpdated={() => void load()} />

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Add to graph
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Create company or people nodes manually.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                onClick={() => setAddOpen(false)}
              >
                Close
              </button>
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setSubmitting(true);
                setSubmitError(null);
                try {
                  const confidenceValue = Number(form.confidence);
                  const confidence = Number.isFinite(confidenceValue)
                    ? confidenceValue
                    : undefined;
                  const payload =
                    kind === "company"
                      ? {
                          kind,
                          label: form.label,
                          subtitle: form.subtitle,
                          website: form.website,
                          sourceUrl: form.sourceUrl,
                          sourceType: form.sourceType,
                          confidence,
                          rawExtract: form.rawExtract,
                        }
                      : {
                          kind,
                          label: form.label,
                          companyId: selectedCompanyId,
                          title: form.title,
                          linkedinUrl: form.linkedinUrl,
                          alumniUrl: form.alumniUrl,
                          lastReachedAt: form.lastReachedAt,
                          lastAttemptAt: form.lastAttemptAt,
                          notes: form.notes,
                          sourceUrl: form.sourceUrl,
                          sourceType: form.sourceType,
                          confidence,
                          rawExtract: form.rawExtract,
                        };
                  const res = await fetch("/api/network/manual", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `HTTP ${res.status}`);
                  }
                  setForm({
                    label: "",
                    subtitle: "",
                    website: "",
                    companyId: companies[0]?.id ?? "",
                    title: "",
                    linkedinUrl: "",
                    alumniUrl: "",
                    lastReachedAt: "",
                    lastAttemptAt: "",
                    notes: "",
                    sourceUrl: "",
                    sourceType: "linkedin",
                    confidence: "0.8",
                    rawExtract: "",
                  });
                  setAddOpen(false);
                  await load();
                } catch (e) {
                  setSubmitError(
                    e instanceof Error ? e.message : "Failed to add item",
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Type
                  <select
                    value={kind}
                    onChange={(e) => {
                      const nextKind = e.target.value as "company" | "person";
                      setKind(nextKind);
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  >
                    <option value="person">Person</option>
                    <option value="company">Company</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Name
                  <input
                    required
                    value={form.label}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, label: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </label>
              </div>

              {kind === "company" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Subtitle
                    <input
                      value={form.subtitle}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          subtitle: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Website
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, website: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Company
                      <select
                        required
                        value={selectedCompanyId}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            companyId: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      >
                        <option value="" disabled>
                          Select company
                        </option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Title
                      <input
                        value={form.title}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, title: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      LinkedIn URL
                      <input
                        type="url"
                        value={form.linkedinUrl}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            linkedinUrl: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Alumni URL
                      <input
                        type="url"
                        value={form.alumniUrl}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            alumniUrl: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Last reached
                      <input
                        type="date"
                        value={form.lastReachedAt}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            lastReachedAt: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Last attempt
                      <input
                        type="date"
                        value={form.lastAttemptAt}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            lastAttemptAt: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Reach notes
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, notes: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                </>
              )}

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Ingestion metadata
                </p>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Source URL
                    <input
                      type="url"
                      value={form.sourceUrl}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          sourceUrl: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Source type
                    <input
                      value={form.sourceType}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          sourceType: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Confidence (0-1)
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={form.confidence}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          confidence: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Raw extract snippet
                    <input
                      value={form.rawExtract}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          rawExtract: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                </div>
              </div>

              {submitError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (kind === "person" && companies.length === 0)}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
