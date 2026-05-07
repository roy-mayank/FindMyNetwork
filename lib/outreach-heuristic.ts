import type {
  CompanyNetworkNode,
  NetworkData,
  PersonNetworkNode,
} from "@/lib/network-types";

/** Stable ids for heuristic components (extend as you add factors). */
export const OUTREACH_FACTOR_IDS = ["internationalHiring"] as const;

export type OutreachFactorId = (typeof OUTREACH_FACTOR_IDS)[number];

export type OutreachFactorMeta = {
  id: OutreachFactorId;
  label: string;
  description?: string;
  defaultEnabled: boolean;
};

export const OUTREACH_FACTORS: readonly OutreachFactorMeta[] = [
  {
    id: "internationalHiring",
    label: "International hiring score",
    description: "Uses the person’s score, else their primary employer’s score, when present.",
    defaultEnabled: true,
  },
] as const;

export const OUTREACH_FACTORS_STORAGE_KEY = "fmn-outreach-factors-v1";

type StoredFactorPrefs = {
  /** Factor ids the user turned off (excluded from the sum, not treated as zero). */
  disabled: string[];
};

function isOutreachFactorId(id: string): id is OutreachFactorId {
  return (OUTREACH_FACTOR_IDS as readonly string[]).includes(id);
}

/** Parse localStorage payload; returns validated disabled ids only. */
export function parseStoredFactorPrefs(raw: string | null): OutreachFactorId[] {
  if (raw == null || raw === "") return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || !Array.isArray((v as StoredFactorPrefs).disabled)) {
      return [];
    }
    return (v as StoredFactorPrefs).disabled.filter(isOutreachFactorId);
  } catch {
    return [];
  }
}

export function serializeFactorPrefs(disabled: Iterable<OutreachFactorId>): string {
  return JSON.stringify({ disabled: [...disabled] } satisfies StoredFactorPrefs);
}

/**
 * Primary employer per person: company→person edges (or person→company); if several,
 * pick the company with the lexicographically smallest id so ordering is stable.
 */
export function buildPrimaryEmployerMap(data: NetworkData): Map<string, CompanyNetworkNode> {
  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const companyById = new Map(
    data.nodes.filter((n): n is CompanyNetworkNode => n.kind === "company").map((c) => [c.id, c]),
  );

  const companyIdsByPerson = new Map<string, string[]>();
  const add = (personId: string, companyId: string) => {
    const list = companyIdsByPerson.get(personId) ?? [];
    list.push(companyId);
    companyIdsByPerson.set(personId, list);
  };

  for (const e of data.edges) {
    const s = nodesById.get(e.source);
    const t = nodesById.get(e.target);
    if (s?.kind === "company" && t?.kind === "person") add(t.id, s.id);
    else if (s?.kind === "person" && t?.kind === "company") add(s.id, t.id);
  }

  const out = new Map<string, CompanyNetworkNode>();
  for (const [personId, companyIds] of companyIdsByPerson) {
    const sorted = [...new Set(companyIds)].sort();
    const pick = sorted[0];
    if (pick) {
      const co = companyById.get(pick);
      if (co) out.set(personId, co);
    }
  }
  return out;
}

export type OutreachScoreResult = {
  total: number;
  breakdown: Partial<Record<OutreachFactorId, number | null>>;
};

/**
 * Aggregate outreach score for one person. Disabled factors contribute nothing to `total`
 * and are omitted from `breakdown` (or null when you want to show “off” in UI — here omitted).
 */
export function computeOutreachScore(
  person: PersonNetworkNode,
  employer: CompanyNetworkNode | undefined,
  enabled: Set<OutreachFactorId>,
): OutreachScoreResult {
  const breakdown: Partial<Record<OutreachFactorId, number | null>> = {};
  let total = 0;

  if (enabled.has("internationalHiring")) {
    const raw = person.internationalHiringScore ?? employer?.internationalHiringScore;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      breakdown.internationalHiring = raw;
      total += raw;
    } else {
      breakdown.internationalHiring = null;
    }
  }

  return { total, breakdown };
}

export type OutreachRankRow = {
  person: PersonNetworkNode;
  primaryEmployer?: CompanyNetworkNode;
  total: number;
  breakdown: Partial<Record<OutreachFactorId, number | null>>;
};

export function buildOutreachRankRows(
  network: NetworkData,
  enabled: Set<OutreachFactorId>,
): OutreachRankRow[] {
  const employerByPerson = buildPrimaryEmployerMap(network);
  const people = network.nodes.filter((n): n is PersonNetworkNode => n.kind === "person");

  const rows: OutreachRankRow[] = people.map((person) => {
    const primaryEmployer = employerByPerson.get(person.id);
    const { total, breakdown } = computeOutreachScore(person, primaryEmployer, enabled);
    return { person, primaryEmployer, total, breakdown };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.person.label.localeCompare(b.person.label);
  });

  return rows;
}

/** All factor ids that exist in the registry (for iterating toggles). */
export function allOutreachFactorIds(): OutreachFactorId[] {
  return [...OUTREACH_FACTOR_IDS];
}

export function enabledSetFromDisabled(disabled: Iterable<OutreachFactorId>): Set<OutreachFactorId> {
  const d = new Set(disabled);
  return new Set(allOutreachFactorIds().filter((id) => !d.has(id)));
}

/** Calendar day string matching how reach dates are saved from the outreach UI (UTC via `toISOString`). */
export function outreachStoredTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when `lastOutreachAt` is on the same stored calendar day (first 10 chars). */
export function personOutreachedOnStoredCalendarDay(
  person: PersonNetworkNode,
  dayISO: string,
): boolean {
  const prefix = person.lastOutreachAt?.slice(0, 10);
  return prefix === dayISO;
}

export function connectionThroughForPersonEmployer(
  network: NetworkData,
  personId: string,
  employerId: string | undefined,
): string | undefined {
  if (!employerId) return undefined;
  for (const e of network.edges) {
    const links =
      (e.source === employerId && e.target === personId) ||
      (e.source === personId && e.target === employerId);
    if (!links || e.connectionThrough == null || e.connectionThrough === "") continue;
    return e.connectionThrough;
  }
  return undefined;
}
