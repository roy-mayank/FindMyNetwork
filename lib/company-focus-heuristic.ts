import {
  buildIndustryByCompanyMap,
  industryMatchesPreference,
} from "@/lib/outreach-heuristic";
import { isIndiaHqCountry } from "@/lib/company-country";
import type { CompanyNetworkNode, NetworkData } from "@/lib/network-types";

/** Fixed penalty when company country is India (not a toggleable factor). */
export const COMPANY_FOCUS_INDIA_HQ_PENALTY = 25;

/** Stable ids for the company-focus heuristic components. */
export const COMPANY_FOCUS_FACTOR_IDS = [
  "internationalHiring",
  "industryPreference",
  "companyFunFacts",
  "purposeLikability",
  "teamDepth",
  "fundingSignal",
  "websiteOnFile",
] as const;

export type CompanyFocusFactorId = (typeof COMPANY_FOCUS_FACTOR_IDS)[number];

export type CompanyFocusFactorMeta = {
  id: CompanyFocusFactorId;
  label: string;
  description?: string;
  defaultEnabled: boolean;
};

/**
 * Per-factor maximum points for the company-only focus heuristic. Tweak in
 * code; rebalancing here is the only place these weights live.
 */
export const COMPANY_FOCUS_FACTOR_POINTS = {
  /** 0–100 raw from the H-1B / LLM hiring signal on the company node. */
  internationalHiring: 100,
  /** Industry-preference bonus when the linked entity matches a keyword. */
  industryPreference: 40,
  /** Bump when the company carries a fun fact / description. */
  companyFunFacts: 15,
  /** purposeLikabilityMatch (1–5) scaled to 0–50 via (val-1)*12.5. */
  purposeLikabilityMax: 50,
  /** Per-person bonus when ≥1 person is linked, capped at TEAM_DEPTH_CAP. */
  teamDepthPerPerson: 8,
  teamDepthCap: 5,
  /** Bump when the company has any fundingSummary on file. */
  fundingSignal: 20,
  /** Small bump when a website is recorded. */
  websiteOnFile: 10,
} as const;

export const COMPANY_FOCUS_FACTORS: readonly CompanyFocusFactorMeta[] = [
  {
    id: "internationalHiring",
    label: "International hiring score",
    description:
      "0–100 from the H-1B / LLM hiring signal on the company. Run the H-1B scrape from data collection to populate it.",
    defaultEnabled: true,
  },
  {
    id: "industryPreference",
    label: "Preferred industry",
    description: `+${COMPANY_FOCUS_FACTOR_POINTS.industryPreference} when the company's industry matches your interests (aviation, software, fintech, engineering, …).`,
    defaultEnabled: true,
  },
  {
    id: "companyFunFacts",
    label: "Company fun facts",
    description: `+${COMPANY_FOCUS_FACTOR_POINTS.companyFunFacts} when the company has a description / fun fact you can hook on.`,
    defaultEnabled: true,
  },
  {
    id: "purposeLikability",
    label: "Purpose / likability",
    description: `Up to +${COMPANY_FOCUS_FACTOR_POINTS.purposeLikabilityMax} when you've rated the company 1–5 on purpose / likability match.`,
    defaultEnabled: true,
  },
  {
    id: "teamDepth",
    label: "Team depth",
    description: `+${COMPANY_FOCUS_FACTOR_POINTS.teamDepthPerPerson} per linked person, capped at ${COMPANY_FOCUS_FACTOR_POINTS.teamDepthCap}. More anchors = easier to break in.`,
    defaultEnabled: true,
  },
  {
    id: "fundingSignal",
    label: "Funding signal",
    description: `+${COMPANY_FOCUS_FACTOR_POINTS.fundingSignal} when a fundingSummary is on file (signals scale-up momentum).`,
    defaultEnabled: true,
  },
  {
    id: "websiteOnFile",
    label: "Website on file",
    description: `+${COMPANY_FOCUS_FACTOR_POINTS.websiteOnFile} when a website is recorded.`,
    defaultEnabled: true,
  },
] as const;

export const COMPANY_FOCUS_FACTORS_STORAGE_KEY = "fmn-company-focus-factors-v1";

type StoredCompanyFocusPrefs = {
  /** Factor ids the user turned off (excluded from the sum, not zeroed). */
  disabled: string[];
};

function isCompanyFocusFactorId(id: string): id is CompanyFocusFactorId {
  return (COMPANY_FOCUS_FACTOR_IDS as readonly string[]).includes(id);
}

/** Parse the localStorage payload; returns validated disabled ids only. */
export function parseStoredCompanyFocusPrefs(
  raw: string | null,
): CompanyFocusFactorId[] {
  if (raw == null || raw === "") return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (
      !v ||
      typeof v !== "object" ||
      !Array.isArray((v as StoredCompanyFocusPrefs).disabled)
    ) {
      return [];
    }
    return (v as StoredCompanyFocusPrefs).disabled.filter(isCompanyFocusFactorId);
  } catch {
    return [];
  }
}

export function serializeCompanyFocusPrefs(
  disabled: Iterable<CompanyFocusFactorId>,
): string {
  return JSON.stringify({
    disabled: [...disabled],
  } satisfies StoredCompanyFocusPrefs);
}

/** All factor ids that exist in the registry (for iterating toggles). */
export function allCompanyFocusFactorIds(): CompanyFocusFactorId[] {
  return [...COMPANY_FOCUS_FACTOR_IDS];
}

export function enabledSetFromDisabledCompanyFocus(
  disabled: Iterable<CompanyFocusFactorId>,
): Set<CompanyFocusFactorId> {
  const d = new Set(disabled);
  return new Set(allCompanyFocusFactorIds().filter((id) => !d.has(id)));
}

/**
 * Map of company id → number of distinct people linked to it (via company↔person
 * edges in either direction). Companies with zero linked people are absent.
 */
export function buildPeopleCountByCompanyMap(data: NetworkData): Map<string, number> {
  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const peopleByCompany = new Map<string, Set<string>>();
  const add = (companyId: string, personId: string) => {
    const set = peopleByCompany.get(companyId) ?? new Set<string>();
    set.add(personId);
    peopleByCompany.set(companyId, set);
  };

  for (const e of data.edges) {
    const s = nodesById.get(e.source);
    const t = nodesById.get(e.target);
    if (s?.kind === "company" && t?.kind === "person") add(s.id, t.id);
    else if (s?.kind === "person" && t?.kind === "company") add(t.id, s.id);
  }

  const out = new Map<string, number>();
  for (const [companyId, set] of peopleByCompany) out.set(companyId, set.size);
  return out;
}

export type CompanyFocusScoreResult = {
  total: number;
  /** Per-factor: number = points awarded; null = data missing for the factor. */
  breakdown: Partial<Record<CompanyFocusFactorId, number | null>>;
};

/**
 * Aggregate company-focus score for one company. Disabled factors contribute
 * nothing to `total` and are omitted from `breakdown`. Each enabled factor
 * records either the points awarded or `null` when the data needed for it is
 * missing (so the UI can show an "—" pill instead of hiding it).
 */
export function computeCompanyFocusScore(
  company: CompanyNetworkNode,
  industryLabel: string | undefined,
  peopleCount: number,
  enabled: Set<CompanyFocusFactorId>,
): CompanyFocusScoreResult {
  const breakdown: Partial<Record<CompanyFocusFactorId, number | null>> = {};
  let total = 0;

  if (enabled.has("internationalHiring")) {
    const raw = company.internationalHiringScore;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      const capped = Math.min(
        COMPANY_FOCUS_FACTOR_POINTS.internationalHiring,
        Math.max(0, raw),
      );
      breakdown.internationalHiring = capped;
      total += capped;
    } else {
      breakdown.internationalHiring = null;
    }
  }

  if (enabled.has("industryPreference")) {
    if (industryMatchesPreference(industryLabel)) {
      breakdown.industryPreference = COMPANY_FOCUS_FACTOR_POINTS.industryPreference;
      total += COMPANY_FOCUS_FACTOR_POINTS.industryPreference;
    } else if (industryLabel) {
      breakdown.industryPreference = 0;
    } else {
      breakdown.industryPreference = null;
    }
  }

  if (enabled.has("companyFunFacts")) {
    const desc = company.description?.trim();
    if (desc && desc.length > 0) {
      breakdown.companyFunFacts = COMPANY_FOCUS_FACTOR_POINTS.companyFunFacts;
      total += COMPANY_FOCUS_FACTOR_POINTS.companyFunFacts;
    } else {
      breakdown.companyFunFacts = 0;
    }
  }

  if (enabled.has("purposeLikability")) {
    const v = company.purposeLikabilityMatch;
    if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 5) {
      const pts = Math.round((v - 1) * 12.5);
      breakdown.purposeLikability = pts;
      total += pts;
    } else {
      breakdown.purposeLikability = null;
    }
  }

  if (enabled.has("teamDepth")) {
    const capped = Math.min(peopleCount, COMPANY_FOCUS_FACTOR_POINTS.teamDepthCap);
    const pts = capped * COMPANY_FOCUS_FACTOR_POINTS.teamDepthPerPerson;
    breakdown.teamDepth = pts;
    total += pts;
  }

  if (enabled.has("fundingSignal")) {
    const fs = company.fundingSummary?.trim();
    if (fs && fs.length > 0) {
      breakdown.fundingSignal = COMPANY_FOCUS_FACTOR_POINTS.fundingSignal;
      total += COMPANY_FOCUS_FACTOR_POINTS.fundingSignal;
    } else {
      breakdown.fundingSignal = 0;
    }
  }

  if (enabled.has("websiteOnFile")) {
    const w = company.website?.trim();
    if (w && w.length > 0) {
      breakdown.websiteOnFile = COMPANY_FOCUS_FACTOR_POINTS.websiteOnFile;
      total += COMPANY_FOCUS_FACTOR_POINTS.websiteOnFile;
    } else {
      breakdown.websiteOnFile = 0;
    }
  }

  return { total, breakdown };
}

export type CompanyFocusRow = {
  company: CompanyNetworkNode;
  /** Industry label of the linked entity node, if any. */
  industry?: string;
  peopleCount: number;
  total: number;
  breakdown: Partial<Record<CompanyFocusFactorId, number | null>>;
  /** Subtracted from factor total when HQ is India; omitted otherwise. */
  indiaPenalty?: number;
};

export type BuildCompanyFocusRowsOptions = {
  /**
   * When true, every company is scored. Default `false` keeps the historical
   * "established only" behavior used by the outreach-page CompanyFocusCard.
   */
  includeStartups?: boolean;
};

/**
 * Filters to confirmed non-startup companies (`startupStatus === "established"`)
 * by default, scores each via {@link computeCompanyFocusScore}, and returns rows
 * sorted by score desc with `company.label` ascending as a stable tie-break.
 * Pass `{ includeStartups: true }` to include every company (used by the graph
 * page list view).
 */
export function buildCompanyFocusRows(
  network: NetworkData,
  enabled: Set<CompanyFocusFactorId>,
  options: BuildCompanyFocusRowsOptions = {},
): CompanyFocusRow[] {
  const industryByCompany = buildIndustryByCompanyMap(network);
  const peopleByCompany = buildPeopleCountByCompanyMap(network);
  const companies = network.nodes.filter((n): n is CompanyNetworkNode => {
    if (n.kind !== "company") return false;
    if (options.includeStartups) return true;
    return n.startupStatus === "established";
  });

  const rows: CompanyFocusRow[] = companies.map((company) => {
    const industry = industryByCompany.get(company.id);
    const peopleCount = peopleByCompany.get(company.id) ?? 0;
    const { total: factorTotal, breakdown } = computeCompanyFocusScore(
      company,
      industry,
      peopleCount,
      enabled,
    );
    let total = factorTotal;
    let indiaPenalty: number | undefined;
    if (isIndiaHqCountry(company.country)) {
      indiaPenalty = COMPANY_FOCUS_INDIA_HQ_PENALTY;
      total = Math.max(0, factorTotal - indiaPenalty);
    }
    return { company, industry, peopleCount, total, breakdown, indiaPenalty };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.company.label.localeCompare(b.company.label);
  });

  return rows;
}
