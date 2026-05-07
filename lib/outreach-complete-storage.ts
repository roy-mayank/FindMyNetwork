/**
 * Tracks outreach queue "Complete" actions (browser localStorage).
 * Counts distinct people marked complete from the Outreach → person modal.
 */

export const OUTREACH_QUEUE_COMPLETE_STORAGE_KEY = "findmynetwork:outreach:queueCompletePeople:v1";

type Stored = {
  personIds: string[];
};

const empty: Stored = { personIds: [] };

export function loadOutreachQueueCompletePeople(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTREACH_QUEUE_COMPLETE_STORAGE_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || !Array.isArray((v as Stored).personIds)) {
      return [];
    }
    const ids = (v as Stored).personIds.filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    );
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

export function countOutreachQueueCompletePeople(): number {
  return loadOutreachQueueCompletePeople().length;
}

/** Call after a successful server save when the user clicks Complete on the outreach queue modal. */
export function recordOutreachQueueComplete(personId: string): void {
  if (typeof window === "undefined" || !personId) return;
  const prev = loadOutreachQueueCompletePeople();
  const next = { personIds: [...new Set([...prev, personId])] };
  window.localStorage.setItem(OUTREACH_QUEUE_COMPLETE_STORAGE_KEY, JSON.stringify(next));
}
