import type {
  CompanyNetworkNode,
  EntityNetworkNode,
  NetworkData,
  PersonNetworkNode,
} from "@/lib/network-types";

/** Stable ids for heuristic components (extend as you add factors). */
export const OUTREACH_FACTOR_IDS = [
  "internationalHiring",
  "emailAvailable",
  "startupBonus",
  "companyFunFacts",
  "industryPreference",
] as const;

export type OutreachFactorId = (typeof OUTREACH_FACTOR_IDS)[number];

export type OutreachFactorMeta = {
  id: OutreachFactorId;
  label: string;
  description?: string;
  defaultEnabled: boolean;
};

/**
 * Per-factor maximum points. Tweak in code; rebalancing here is the only
 * place the heuristic weights live. Total max with all factors enabled and
 * all hits is roughly the sum of these caps.
 */
export const OUTREACH_FACTOR_POINTS = {
  /** 0–100, taken raw from the LLM/H-1B-derived score on person or employer. */
  internationalHiring: 100,
  /** Large boost when an email is on file (lets you actually reach them). */
  emailAvailable: 60,
  /** Lower amount when only a secondary email is recorded. */
  emailAvailableSecondaryOnly: 30,
  /** Bump for being at a startup (smaller, more-personable orgs). */
  startupBonus: 25,
  /** Small bump when the company carries a fun fact / description. */
  companyFunFacts: 15,
  /** Industry-preference bonus when the linked entity matches a keyword. */
  industryPreference: 40,
} as const;

/**
 * Case-insensitive substring keywords matched against a company's industry
 * label (the linked entity node's label). Edit this list to retune which
 * industries get the preference bump.
 */
export const INDUSTRY_PREFERENCE_KEYWORDS: readonly string[] = [
  "aviation",
  "aerospace",
  "drone",
  "space",
  "defense",
  "satellite",
  "software",
  "fintech",
  "engineering",
  "robotics",
  "semiconductor",
  "automation",
  "quantum",
  "deep tech",
];

export const OUTREACH_FACTORS: readonly OutreachFactorMeta[] = [
  {
    id: "internationalHiring",
    label: "International hiring score",
    description:
      "0–100 from the H-1B / LLM hiring signal on the person, falling back to their primary employer. Startup employers count as the full score automatically.",
    defaultEnabled: true,
  },
  {
    id: "emailAvailable",
    label: "Email on file",
    description: `+${OUTREACH_FACTOR_POINTS.emailAvailable} when a primary email is recorded; +${OUTREACH_FACTOR_POINTS.emailAvailableSecondaryOnly} when only a secondary email is.`,
    defaultEnabled: true,
  },
  {
    id: "startupBonus",
    label: "Startup employer",
    description: `+${OUTREACH_FACTOR_POINTS.startupBonus} when the primary employer is marked as a startup (vs established).`,
    defaultEnabled: true,
  },
  {
    id: "companyFunFacts",
    label: "Company fun facts",
    description: `+${OUTREACH_FACTOR_POINTS.companyFunFacts} when the primary employer has a description / fun fact you can hook on.`,
    defaultEnabled: true,
  },
  {
    id: "industryPreference",
    label: "Preferred industry",
    description: `+${OUTREACH_FACTOR_POINTS.industryPreference} when the company's industry matches your interests (aviation, software, fintech, engineering, …).`,
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

/**
 * Map of company id → industry label (the linked entity node's label).
 * Companies with no entity edge are absent from the map. If a company has
 * multiple entity edges we keep the lexicographically smallest entity id for
 * deterministic ordering, mirroring `buildPrimaryEmployerMap`.
 */
export function buildIndustryByCompanyMap(data: NetworkData): Map<string, string> {
  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const entitiesByCompany = new Map<string, EntityNetworkNode[]>();

  for (const e of data.edges) {
    const s = nodesById.get(e.source);
    const t = nodesById.get(e.target);
    let entity: EntityNetworkNode | undefined;
    let companyId: string | undefined;
    if (s?.kind === "entity" && t?.kind === "company") {
      entity = s;
      companyId = t.id;
    } else if (s?.kind === "company" && t?.kind === "entity") {
      entity = t;
      companyId = s.id;
    }
    if (!entity || !companyId) continue;
    const list = entitiesByCompany.get(companyId) ?? [];
    list.push(entity);
    entitiesByCompany.set(companyId, list);
  }

  const out = new Map<string, string>();
  for (const [companyId, entities] of entitiesByCompany) {
    const pick = [...entities].sort((a, b) => a.id.localeCompare(b.id))[0];
    if (pick) out.set(companyId, pick.label);
  }
  return out;
}

/** True when `industryLabel` matches any keyword in {@link INDUSTRY_PREFERENCE_KEYWORDS}. */
export function industryMatchesPreference(industryLabel: string | undefined): boolean {
  if (!industryLabel) return false;
  const haystack = industryLabel.toLowerCase();
  return INDUSTRY_PREFERENCE_KEYWORDS.some((kw) => haystack.includes(kw));
}

export type OutreachScoreResult = {
  total: number;
  breakdown: Partial<Record<OutreachFactorId, number | null>>;
};

/**
 * Aggregate outreach score for one person. Disabled factors contribute nothing to `total`
 * and are omitted from `breakdown`. Each enabled factor is recorded in `breakdown` either
 * as the points awarded or `null` when the data needed for the factor is missing
 * (so the UI can render an "—" pill instead of hiding it).
 */
export function computeOutreachScore(
  person: PersonNetworkNode,
  employer: CompanyNetworkNode | undefined,
  industryLabel: string | undefined,
  enabled: Set<OutreachFactorId>,
): OutreachScoreResult {
  const breakdown: Partial<Record<OutreachFactorId, number | null>> = {};
  let total = 0;

  if (enabled.has("internationalHiring")) {
    const startupEmployer = employer?.startupStatus === "startup";
    const raw = person.internationalHiringScore ?? employer?.internationalHiringScore;
    if (startupEmployer) {
      breakdown.internationalHiring = OUTREACH_FACTOR_POINTS.internationalHiring;
      total += OUTREACH_FACTOR_POINTS.internationalHiring;
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      const capped = Math.min(OUTREACH_FACTOR_POINTS.internationalHiring, Math.max(0, raw));
      breakdown.internationalHiring = capped;
      total += capped;
    } else {
      breakdown.internationalHiring = null;
    }
  }

  if (enabled.has("emailAvailable")) {
    const hasPrimary = typeof person.email === "string" && person.email.trim().length > 0;
    const hasSecondary =
      typeof person.secondaryEmail === "string" && person.secondaryEmail.trim().length > 0;
    if (hasPrimary) {
      breakdown.emailAvailable = OUTREACH_FACTOR_POINTS.emailAvailable;
      total += OUTREACH_FACTOR_POINTS.emailAvailable;
    } else if (hasSecondary) {
      breakdown.emailAvailable = OUTREACH_FACTOR_POINTS.emailAvailableSecondaryOnly;
      total += OUTREACH_FACTOR_POINTS.emailAvailableSecondaryOnly;
    } else {
      breakdown.emailAvailable = 0;
    }
  }

  if (enabled.has("startupBonus")) {
    if (employer?.startupStatus === "startup") {
      breakdown.startupBonus = OUTREACH_FACTOR_POINTS.startupBonus;
      total += OUTREACH_FACTOR_POINTS.startupBonus;
    } else if (employer) {
      breakdown.startupBonus = 0;
    } else {
      breakdown.startupBonus = null;
    }
  }

  if (enabled.has("companyFunFacts")) {
    const desc = employer?.description?.trim();
    if (desc && desc.length > 0) {
      breakdown.companyFunFacts = OUTREACH_FACTOR_POINTS.companyFunFacts;
      total += OUTREACH_FACTOR_POINTS.companyFunFacts;
    } else if (employer) {
      breakdown.companyFunFacts = 0;
    } else {
      breakdown.companyFunFacts = null;
    }
  }

  if (enabled.has("industryPreference")) {
    if (industryMatchesPreference(industryLabel)) {
      breakdown.industryPreference = OUTREACH_FACTOR_POINTS.industryPreference;
      total += OUTREACH_FACTOR_POINTS.industryPreference;
    } else if (industryLabel) {
      breakdown.industryPreference = 0;
    } else {
      breakdown.industryPreference = null;
    }
  }

  return { total, breakdown };
}

export type OutreachRankRow = {
  person: PersonNetworkNode;
  primaryEmployer?: CompanyNetworkNode;
  /** Industry label of the primary employer (linked entity node), if any. */
  primaryEmployerIndustry?: string;
  total: number;
  breakdown: Partial<Record<OutreachFactorId, number | null>>;
};

export function buildOutreachRankRows(
  network: NetworkData,
  enabled: Set<OutreachFactorId>,
): OutreachRankRow[] {
  const employerByPerson = buildPrimaryEmployerMap(network);
  const industryByCompany = buildIndustryByCompanyMap(network);
  const people = network.nodes.filter((n): n is PersonNetworkNode => n.kind === "person");

  const rows: OutreachRankRow[] = people.map((person) => {
    const primaryEmployer = employerByPerson.get(person.id);
    const primaryEmployerIndustry = primaryEmployer
      ? industryByCompany.get(primaryEmployer.id)
      : undefined;
    const { total, breakdown } = computeOutreachScore(
      person,
      primaryEmployer,
      primaryEmployerIndustry,
      enabled,
    );
    return { person, primaryEmployer, primaryEmployerIndustry, total, breakdown };
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
