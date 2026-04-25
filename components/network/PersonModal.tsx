"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import {
  applyLatestProposalAction,
  listPendingProposalsAction,
} from "@/app/actions/network";
import type { NetworkNode } from "@/lib/network-types";

type PersonModalProps = {
  node: NetworkNode | null;
  open: boolean;
  onClose: () => void;
  onNetworkUpdated?: () => void;
};

const kindLabel: Record<NetworkNode["kind"], string> = {
  me: "You",
  entity: "Place / org",
  company: "Company",
  person: "Person",
};

export function PersonModal({
  node,
  open,
  onClose,
  onNetworkUpdated,
}: PersonModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          if (!cancelled) setPendingCount(rows.length);
        } catch {
          if (!cancelled) setPendingCount(0);
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
  const linkedin =
    isPerson && node.linkedinUrl ? node.linkedinUrl.trim() : "";
  const alumni = isPerson && node.alumniUrl ? node.alumniUrl.trim() : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="network-node-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              {kindLabel[node.kind]}
            </p>
            <h2
              id="network-node-title"
              className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {node.label}
            </h2>
            {isPerson && node.title ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {node.title}
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
                Pending MCP proposals for this person:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {pendingCount}
                </span>
              </p>
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
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                MCP tools <code className="rounded bg-zinc-200/80 px-1 dark:bg-zinc-700">propose_network_patch</code>{" "}
                and <code className="rounded bg-zinc-200/80 px-1 dark:bg-zinc-700">apply_network_patch</code> use the
                same API as this app. Apply merges the newest pending proposal created for this person.
              </p>
            </div>

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
        ) : (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            Click a person node to see LinkedIn and alumni links. Edit nodes
            and edges in{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
              the database via MCP / API
            </code>
            .
          </p>
        )}
      </div>
    </div>
  );
}
