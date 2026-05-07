import type { NetworkNode, PersonNetworkNode } from "@/lib/network-types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Local start of June 1, 2027 (OPT clock trigger). */
const OPT_CLOCK_TRIGGER = new Date(2027, 5, 1);

/**
 * Whole local-calendar days from the start of `now`’s date to June 1, 2027.
 * Negative if that date is already in the past.
 */
export function calendarDaysUntilOptClockTrigger(now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((OPT_CLOCK_TRIGGER.getTime() - today.getTime()) / MS_PER_DAY);
}

export function countCompanyNodes(nodes: NetworkNode[]): number {
  return nodes.filter((n) => n.kind === "company").length;
}

export function countPersonNodes(nodes: NetworkNode[]): number {
  return nodes.filter((n) => n.kind === "person").length;
}

/**
 * Counts people who look like they got a post-reply update: either a numeric
 * `lastOutreachScore` or `confidence` on the person node (from Collect → “Update after reply”).
 */
export function countPeopleWithReplySignals(nodes: NetworkNode[]): number {
  return nodes.filter((n): n is PersonNetworkNode => {
    if (n.kind !== "person") return false;
    const scoreOk =
      typeof n.lastOutreachScore === "number" && Number.isFinite(n.lastOutreachScore);
    const confOk = typeof n.confidence === "number" && Number.isFinite(n.confidence);
    return scoreOk || confOk;
  }).length;
}
