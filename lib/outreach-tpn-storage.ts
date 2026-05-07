/**
 * Persisted outreach timing stats (browser localStorage).
 * TPN = time per network contact = elapsed seconds ÷ people reached out to.
 */

export const TPN_STORAGE_KEY = "findmynetwork:outreach:tpnAggregate";

export type TpnAggregate = {
  /** Number of completed sessions (each contributes one TPN sample). */
  sessionCount: number;
  /** Sum of TPN values in seconds per person (mean = sum / sessionCount). */
  sumTpnSeconds: number;
  /** Sum of each session wall-clock duration (seconds), for “time spent networking”. */
  sumSessionElapsedSeconds: number;
};

const empty: TpnAggregate = { sessionCount: 0, sumTpnSeconds: 0, sumSessionElapsedSeconds: 0 };

export function loadTpnAggregate(): TpnAggregate {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(TPN_STORAGE_KEY);
    if (!raw) return empty;
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return empty;
    const sessionCount = Number((v as TpnAggregate).sessionCount);
    const sumTpnSeconds = Number((v as TpnAggregate).sumTpnSeconds);
    const sumSessionRaw = Number((v as TpnAggregate).sumSessionElapsedSeconds);
    if (!Number.isFinite(sessionCount) || !Number.isFinite(sumTpnSeconds) || sessionCount < 0) {
      return empty;
    }
    const sumSessionElapsedSeconds =
      Number.isFinite(sumSessionRaw) && sumSessionRaw >= 0 ? sumSessionRaw : 0;
    return { sessionCount: Math.floor(sessionCount), sumTpnSeconds, sumSessionElapsedSeconds };
  } catch {
    return empty;
  }
}

export function saveTpnAggregate(agg: TpnAggregate): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TPN_STORAGE_KEY, JSON.stringify(agg));
}

/**
 * @param elapsedMs Session duration in milliseconds
 * @param peopleReached Positive integer count of people reached
 * @returns TPN in seconds per person and updated aggregate (caller should persist).
 */
export function appendTpnSession(
  elapsedMs: number,
  peopleReached: number,
): { tpnSeconds: number; aggregate: TpnAggregate } {
  const elapsedSec = Math.max(0, elapsedMs) / 1000;
  const n = Math.max(1, Math.floor(peopleReached));
  const tpnSeconds = elapsedSec / n;
  const prev = loadTpnAggregate();
  const aggregate: TpnAggregate = {
    sessionCount: prev.sessionCount + 1,
    sumTpnSeconds: prev.sumTpnSeconds + tpnSeconds,
    sumSessionElapsedSeconds: prev.sumSessionElapsedSeconds + elapsedSec,
  };
  saveTpnAggregate(aggregate);
  return { tpnSeconds, aggregate };
}

/** Human-readable duration from total seconds (outreach timer sessions). */
export function formatNetworkingDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0m";
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r > 0 ? `${r}s` : ""}`.trim();
  return `${r}s`;
}

export function formatTpn(secondsPerPerson: number): string {
  if (!Number.isFinite(secondsPerPerson) || secondsPerPerson <= 0) return "—";
  if (secondsPerPerson < 90) {
    return `${secondsPerPerson < 10 ? secondsPerPerson.toFixed(1) : Math.round(secondsPerPerson)}s per person`;
  }
  const m = Math.floor(secondsPerPerson / 60);
  const s = Math.round(secondsPerPerson % 60);
  return `${m}m ${s}s per person`;
}

export function resetTpnAggregate(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TPN_STORAGE_KEY);
}
