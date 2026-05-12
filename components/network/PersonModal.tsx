"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import {
  applyProposalAction,
  applyLatestProposalAction,
  generateEmailDraftsAction,
  listEmailDraftsAction,
  listPendingProposalsAction,
  rejectProposalAction,
} from "@/app/actions/network";
import type { EnrichmentArtifactType } from "@/lib/llm/schemas/enrichment-extraction";
import type { EmailDraft, FlowNodePayload } from "@/lib/network-types";

type PersonModalProps = {
  node: FlowNodePayload | null;
  open: boolean;
  onClose: () => void;
  onNetworkUpdated?: () => void;
};

const kindLabel: Record<FlowNodePayload["kind"], string> = {
  me: "You",
  entity: "Place / org",
  company: "Company",
  person: "Person",
  cluster: "Cluster",
};

export function PersonModal({
  node,
  open,
  onClose,
  onNetworkUpdated,
}: PersonModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [proposals, setProposals] = useState<
    { id: string; createdAt: string; evidenceUrls: string[] }[]
  >([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [directoryForm, setDirectoryForm] = useState({
    email: "",
    secondaryEmail: "",
    directoryProfileUrl: "",
    verificationStatus: "unverified",
    notes: "",
    evidenceUrls: "",
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [insightArtifactType, setInsightArtifactType] =
    useState<EnrichmentArtifactType>("linkedin_text");
  const [insightPaste, setInsightPaste] = useState("");
  const [insightBusy, setInsightBusy] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!open || !node || node.kind !== "person") {
        setPendingCount(0);
        setActionError(null);
        return;
      }
      void (async () => {
        try {
          const rows = await listPendingProposalsAction(node.id);
          if (!cancelled) {
            setPendingCount(rows.length);
            setProposals(
              rows.map((row) => ({
                id: row.id,
                createdAt: row.createdAt,
                evidenceUrls: row.evidenceUrls,
              })),
            );
          }
        } catch {
          if (!cancelled) {
            setPendingCount(0);
            setProposals([]);
          }
        }
        try {
          const rows = await listEmailDraftsAction(node.id);
          if (!cancelled) setDrafts(rows);
        } catch {
          if (!cancelled) setDrafts([]);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [open, node]);

  useEffect(() => {
    if (!open || !node) return;
    const root = panelRef.current;
    if (!root) return;
    const focusable = root.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [open, node]);

  if (!open || !node) return null;

  const isPerson = node.kind === "person";
  const isCluster = node.kind === "cluster";
  const linkedin =
    isPerson && node.linkedinUrl ? node.linkedinUrl.trim() : "";
  const alumni = isPerson && node.alumniUrl ? node.alumniUrl.trim() : "";
  const hasReachInfo =
    isPerson &&
    (Boolean(node.lastOutreachAt) ||
      Boolean(node.lastAttemptAt) ||
      Boolean(node.notes) ||
      Boolean(node.email) ||
      Boolean(node.secondaryEmail) ||
      Boolean(node.directoryProfileUrl));
  const canDelete = node.kind === "person" || node.kind === "company";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-violet-950/45 backdrop-blur-[2px] dark:bg-black/55"
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="network-node-title"
        className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-amber-200/70 bg-gradient-to-b from-white via-white to-sky-50/50 p-6 shadow-2xl shadow-amber-200/25 ring-1 ring-white/70 dark:border-violet-500/35 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/50 dark:shadow-violet-950/40 dark:ring-violet-500/15"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-amber-300/90">
              {kindLabel[node.kind]}
            </p>
            <h2
              id="network-node-title"
              className="mt-1 bg-gradient-to-r from-violet-700 to-fuchsia-700 bg-clip-text text-xl font-bold text-transparent dark:from-sky-200 dark:to-amber-200"
            >
              {node.label}
            </h2>
            {isPerson && node.title ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {node.title}
              </p>
            ) : null}
            {isPerson &&
            typeof node.internationalHiringScore === "number" &&
            Number.isFinite(node.internationalHiringScore) ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Intl hiring score (model-assisted):{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {node.internationalHiringScore}
                </span>
                {node.hiringSignalsSummary ? ` — ${node.hiringSignalsSummary}` : null}
              </p>
            ) : null}
            {!isPerson && "subtitle" in node && node.subtitle ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {node.subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Close
          </button>
        </div>

        {isPerson ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Enrichment (Series A/B pipeline)
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Pending enrichment proposals for this person:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {pendingCount}
                </span>
              </p>
              <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900/60 dark:bg-violet-950/25">
                <p className="text-xs font-medium text-violet-900 dark:text-violet-100">
                  Claude insights
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-violet-900/80 dark:text-violet-200/90">
                  Paste profile text, Careershift export, or OPT/H-1B tables you have rights to use. Creates a
                  pending proposal—review before apply.
                </p>
                <label className="mt-2 block text-[11px] font-medium text-violet-900 dark:text-violet-100">
                  Artifact type
                  <select
                    value={insightArtifactType}
                    onChange={(e) =>
                      setInsightArtifactType(e.target.value as EnrichmentArtifactType)
                    }
                    className="mt-1 w-full rounded-md border border-violet-200 bg-white px-2 py-1.5 text-xs dark:border-violet-800 dark:bg-zinc-900"
                  >
                    <option value="linkedin_text">LinkedIn / general text</option>
                    <option value="linkedin_json">LinkedIn JSON</option>
                    <option value="careershift_text">Careershift paste</option>
                    <option value="hiring_table_text">Hiring / OPT / H-1B table</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste artifact text or JSON here…"
                  value={insightPaste}
                  onChange={(e) => setInsightPaste(e.target.value)}
                  className="mt-2 w-full rounded-md border border-violet-200 bg-white px-2 py-1.5 text-xs dark:border-violet-800 dark:bg-zinc-900"
                />
                {insightError ? (
                  <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{insightError}</p>
                ) : null}
                <button
                  type="button"
                  disabled={insightBusy || !insightPaste.trim()}
                  onClick={async () => {
                    setInsightError(null);
                    if (!insightPaste.trim()) {
                      setInsightError("Add pasted text.");
                      return;
                    }
                    setInsightBusy(true);
                    try {
                      const artifacts = [
                        {
                          id: `paste-${Date.now()}`,
                          type: insightArtifactType,
                          content: insightPaste.trim(),
                        },
                      ];
                      const res = await fetch("/api/network/enrich-insights", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          personId: node.id,
                          artifacts,
                        }),
                      });
                      if (!res.ok) {
                        const text = await res.text();
                        throw new Error(text || `HTTP ${res.status}`);
                      }
                      setInsightPaste("");
                      const rows = await listPendingProposalsAction(node.id);
                      setPendingCount(rows.length);
                      setProposals(
                        rows.map((row) => ({
                          id: row.id,
                          createdAt: row.createdAt,
                          evidenceUrls: row.evidenceUrls,
                        })),
                      );
                    } catch (e) {
                      setInsightError(e instanceof Error ? e.message : "Enrich failed");
                    } finally {
                      setInsightBusy(false);
                    }
                  }}
                  className="mt-2 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-medium text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {insightBusy ? "Running Claude…" : "Run Claude extract"}
                </button>
              </div>
              {actionError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{actionError}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending || pendingCount === 0}
                  onClick={() => {
                    setActionError(null);
                    startTransition(async () => {
                      try {
                        const result = await applyLatestProposalAction(node.id);
                        if (!result.applied) {
                          setActionError("No pending proposals to apply.");
                          return;
                        }
                        const rows = await listPendingProposalsAction(node.id);
                        setPendingCount(rows.length);
                        setProposals(
                          rows.map((row) => ({
                            id: row.id,
                            createdAt: row.createdAt,
                            evidenceUrls: row.evidenceUrls,
                          })),
                        );
                        onNetworkUpdated?.();
                      } catch (e) {
                        setActionError(
                          e instanceof Error ? e.message : "Apply failed",
                        );
                      }
                    });
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Applying…" : "Apply latest proposal"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setActionError(null);
                    startTransition(async () => {
                      try {
                        const rows = await listPendingProposalsAction(node.id);
                        setPendingCount(rows.length);
                        setProposals(
                          rows.map((row) => ({
                            id: row.id,
                            createdAt: row.createdAt,
                            evidenceUrls: row.evidenceUrls,
                          })),
                        );
                      } catch (e) {
                        setActionError(
                          e instanceof Error ? e.message : "Refresh failed",
                        );
                      }
                    });
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Refresh pending count
                </button>
                <button
                  type="button"
                  disabled={isPending || proposals.length === 0}
                  onClick={() => {
                    const latest = proposals[0];
                    if (!latest) return;
                    setActionError(null);
                    startTransition(async () => {
                      try {
                        await rejectProposalAction(latest.id);
                        const rows = await listPendingProposalsAction(node.id);
                        setPendingCount(rows.length);
                        setProposals(
                          rows.map((row) => ({
                            id: row.id,
                            createdAt: row.createdAt,
                            evidenceUrls: row.evidenceUrls,
                          })),
                        );
                      } catch (e) {
                        setActionError(
                          e instanceof Error ? e.message : "Reject failed",
                        );
                      }
                    });
                  }}
                  className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  Reject latest proposal
                </button>
              </div>
              {proposals.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {proposals.slice(0, 3).map((proposal) => (
                    <div
                      key={proposal.id}
                      className="rounded-lg border border-zinc-200 bg-white p-2 text-[11px] dark:border-zinc-700 dark:bg-zinc-900/60"
                    >
                      <p className="font-medium text-zinc-700 dark:text-zinc-200">
                        Proposal {proposal.id.slice(0, 8)} - {proposal.createdAt}
                      </p>
                      <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        Evidence URLs: {proposal.evidenceUrls.length}
                      </p>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setActionError(null);
                          startTransition(async () => {
                            try {
                              await applyProposalAction(proposal.id);
                              const rows = await listPendingProposalsAction(node.id);
                              setPendingCount(rows.length);
                              setProposals(
                                rows.map((row) => ({
                                  id: row.id,
                                  createdAt: row.createdAt,
                                  evidenceUrls: row.evidenceUrls,
                                })),
                              );
                              onNetworkUpdated?.();
                            } catch (e) {
                              setActionError(
                                e instanceof Error ? e.message : "Apply failed",
                              );
                            }
                          });
                        }}
                        className="mt-2 rounded-md bg-amber-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        Apply this proposal
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Proposals can come from <strong>Claude insights</strong>, directory enrichment, or{" "}
                <code className="rounded bg-zinc-200/80 px-1 dark:bg-zinc-700">POST /api/network/proposals</code> with
                your API secret. <strong>Apply latest</strong> merges the newest pending row for this person.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                University directory enrichment
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="email"
                  placeholder="Primary email"
                  value={directoryForm.email}
                  onChange={(e) =>
                    setDirectoryForm((current) => ({ ...current, email: e.target.value }))
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                />
                <input
                  type="email"
                  placeholder="Secondary email"
                  value={directoryForm.secondaryEmail}
                  onChange={(e) =>
                    setDirectoryForm((current) => ({
                      ...current,
                      secondaryEmail: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                />
                <input
                  type="url"
                  placeholder="Directory profile URL"
                  value={directoryForm.directoryProfileUrl}
                  onChange={(e) =>
                    setDirectoryForm((current) => ({
                      ...current,
                      directoryProfileUrl: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                />
                <select
                  value={directoryForm.verificationStatus}
                  onChange={(e) =>
                    setDirectoryForm((current) => ({
                      ...current,
                      verificationStatus: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                >
                  <option value="unverified">unverified</option>
                  <option value="verified">verified</option>
                  <option value="bounced">bounced</option>
                  <option value="unknown">unknown</option>
                </select>
              </div>
              <textarea
                rows={2}
                placeholder="Directory notes"
                value={directoryForm.notes}
                onChange={(e) =>
                  setDirectoryForm((current) => ({ ...current, notes: e.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-900"
              />
              <input
                placeholder="Evidence URLs (comma-separated)"
                value={directoryForm.evidenceUrls}
                onChange={(e) =>
                  setDirectoryForm((current) => ({
                    ...current,
                    evidenceUrls: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-900"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setActionError(null);
                  startTransition(async () => {
                    try {
                      const evidenceUrls = directoryForm.evidenceUrls
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean);
                      const res = await fetch("/api/network/enrich-directory", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          personId: node.id,
                          email: directoryForm.email,
                          secondaryEmail: directoryForm.secondaryEmail,
                          directoryProfileUrl: directoryForm.directoryProfileUrl,
                          verificationStatus: directoryForm.verificationStatus,
                          notes: directoryForm.notes,
                          evidenceUrls,
                        }),
                      });
                      if (!res.ok) {
                        const text = await res.text();
                        throw new Error(text || `HTTP ${res.status}`);
                      }
                      const rows = await listPendingProposalsAction(node.id);
                      setPendingCount(rows.length);
                      setProposals(
                        rows.map((row) => ({
                          id: row.id,
                          createdAt: row.createdAt,
                          evidenceUrls: row.evidenceUrls,
                        })),
                      );
                    } catch (e) {
                      setActionError(
                        e instanceof Error ? e.message : "Create proposal failed",
                      );
                    }
                  });
                }}
                className="mt-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                Create contact proposal
              </button>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Outreach drafts
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setActionError(null);
                    startTransition(async () => {
                      try {
                        const rows = await generateEmailDraftsAction(node.id);
                        setDrafts(rows);
                      } catch (e) {
                        setActionError(
                          e instanceof Error ? e.message : "Draft generation failed",
                        );
                      }
                    });
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending ? "Working..." : "Generate drafts"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const rows = await listEmailDraftsAction(node.id);
                      setDrafts(rows);
                    });
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Refresh drafts
                </button>
              </div>
              {drafts.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {drafts.slice(0, 3).map((draft) => (
                    <div
                      key={draft.id}
                      className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/60"
                    >
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                        {draft.draftType.replace("_", " ")} - {draft.subject}
                      </p>
                      <p className="mt-1 line-clamp-4 text-xs whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">
                        {draft.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  No drafts yet. Generate to create short, detailed, and follow-up versions.
                </p>
              )}
            </div>
            {hasReachInfo ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Reach tracking
                </p>
                {node.lastOutreachAt ? (
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-medium">Last reached:</span>{" "}
                    {node.lastOutreachAt}
                  </p>
                ) : null}
                {node.lastAttemptAt ? (
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-medium">Last attempt:</span>{" "}
                    {node.lastAttemptAt}
                  </p>
                ) : null}
                {node.notes ? (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                    <span className="font-medium">Notes:</span> {node.notes}
                  </p>
                ) : null}
                {node.email ? (
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-medium">Email:</span> {node.email}
                  </p>
                ) : null}
                {node.secondaryEmail ? (
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-medium">Secondary email:</span> {node.secondaryEmail}
                  </p>
                ) : null}
                {node.directoryProfileUrl ? (
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-medium">Directory profile:</span>{" "}
                    <a
                      href={node.directoryProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Open
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              {linkedin ? (
                <a
                  href={linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#0A66C2] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004182]"
                >
                  LinkedIn
                </a>
              ) : null}
              {alumni ? (
                <a
                  href={alumni}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                >
                  Alumni link
                </a>
              ) : null}
              {!linkedin && !alumni ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Add `linkedinUrl` and `alumniUrl` on this person in your data
                  file.
                </p>
              ) : null}
            </div>
          </div>
        ) : isCluster ? (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Cluster summary
              </p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                Grouping:{" "}
                <span className="font-medium">
                  {node.groupBy === "startup"
                    ? "Startup vs established"
                    : node.groupBy === "outreach"
                      ? "Outreach recency"
                      : node.groupBy === "country"
                        ? "Country"
                        : node.groupBy}
                </span>
              </p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                Members: <span className="font-medium">{node.count}</span>
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Sample members
              </p>
              {node.memberLabels.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
                  {node.memberLabels.map((label, index) => (
                    <li key={`${label}-${index}`}>- {label}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No member labels available.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            Click a person node to see LinkedIn and alumni links. Edit nodes and edges via the{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">HTTP API</code> or the app UI.
          </p>
        )}

        {canDelete ? (
          <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Danger zone
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const targetLabel = node.kind === "person" ? "person" : "company";
                const ok = window.confirm(
                  `Delete this ${targetLabel}? This cannot be undone.`,
                );
                if (!ok) return;
                setActionError(null);
                startTransition(async () => {
                  try {
                    const res = await fetch("/api/network/manual", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: node.id, kind: node.kind }),
                    });
                    if (!res.ok) {
                      const text = await res.text();
                      throw new Error(text || `HTTP ${res.status}`);
                    }
                    onClose();
                    onNetworkUpdated?.();
                  } catch (e) {
                    setActionError(
                      e instanceof Error ? e.message : "Delete failed",
                    );
                  }
                });
              }}
              className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              {isPending ? "Deleting..." : `Delete ${node.kind}`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
