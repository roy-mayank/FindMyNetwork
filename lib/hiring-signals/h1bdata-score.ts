import type {
  EmployerSummary,
  JobTitleSummary,
} from "@/lib/hiring-signals/h1bdata-parser";

/**
 * Bumping this when the formula changes lets stored snapshots be re-scored
 * later without losing the original numbers (formulaVersion is persisted).
 */
export const H1B_SCORE_FORMULA_VERSION = 1;

/**
 * Soft caps used for log-normalization. A company at or above the cap saturates
 * to ~1.0 on its component. Tunable; bumping requires a formula version bump.
 */
const VOLUME_CAP = 10_000;
const TITLES_CAP = 200;
const VOLUME_WEIGHT = 0.7;
const TITLES_WEIGHT = 0.3;

export type H1bScoreInput = {
  totalH1bRecords: number;
  distinctJobTitles: number;
};

/**
 * 0–100 "international hiring friendliness" score.
 *
 * Formula v1: 70% volume (log-scaled total H-1B records) + 30% role diversity
 * (log-scaled distinct job titles). Both components saturate so a hyperscaler
 * lands ~95–100 and a one-record shop lands ~0–10.
 */
export function computeInternationalScore(input: H1bScoreInput): number {
  const records = Math.max(0, Math.floor(input.totalH1bRecords));
  const titles = Math.max(0, Math.floor(input.distinctJobTitles));
  if (records <= 0) return 0;
  const volume = Math.min(1, Math.log10(records + 1) / Math.log10(VOLUME_CAP));
  const titleScore = Math.min(1, Math.log10(titles + 1) / Math.log10(TITLES_CAP));
  const raw = volume * VOLUME_WEIGHT + titleScore * TITLES_WEIGHT;
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

/**
 * One-line, citation-friendly summary string saved to the company payload.
 * Mirrors the shape of `hiringSignalsSummary` already produced by Claude
 * enrichment so existing UI ("Intl hiring score (model-assisted): N — <summary>")
 * keeps working without changes.
 */
export function buildHiringSummary(args: {
  companyName: string;
  year: number;
  matchedEmployers: EmployerSummary[];
  jobTitles: JobTitleSummary[];
}): string {
  const totalRecords = args.matchedEmployers.reduce((sum, e) => sum + e.count, 0);
  const top = args.matchedEmployers
    .slice(0, 3)
    .map((e) => `${e.name} (${e.count.toLocaleString()})`)
    .join(", ");
  const titlePart =
    args.jobTitles.length > 0
      ? `; ${args.jobTitles.length} distinct job titles in result set`
      : "";
  if (args.matchedEmployers.length === 0) {
    return `H-1B ${args.year} (h1bdata.info): no employer entry matched "${args.companyName}".`;
  }
  return `H-1B ${args.year} (h1bdata.info): ${totalRecords.toLocaleString()} records across ${args.matchedEmployers.length} matched employer ${args.matchedEmployers.length === 1 ? "entry" : "entries"}${titlePart}. Top: ${top}.`;
}
