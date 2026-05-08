/**
 * Parsers for h1bdata.info index page HTML.
 *
 * The page renders four "dropdown-menu" lists (employers, job titles, cities, years)
 * before the main results table. Each list item looks like:
 *
 *   <a role="menuitem" href="index.php?em=APPLE+INC&job=&city=&year=2025">
 *     APPLE INC
 *     <span class="pull-right">
 *       <span class="label label-warning"> Median $174,462</span>
 *       <span class="badge">7089</span>
 *     </span>
 *   </a>
 *
 * Employer items have a non-empty `em=` and empty `job=`.
 * Job-title items have a non-empty `job=` (and `em=` set to the original query).
 *
 * We parse just these two lists; they're small (a few hundred items at most) and
 * carry the totals we need without scanning the full ~3MB results table.
 */

export type EmployerSummary = {
  name: string;
  count: number;
  medianSalaryUsd: number | null;
};

export type JobTitleSummary = {
  title: string;
  count: number;
  medianSalaryUsd: number | null;
};

export type H1bIndexParse = {
  employers: EmployerSummary[];
  jobTitles: JobTitleSummary[];
};

/**
 * One regex matches every dropdown <a> item with name + median + count.
 * We then route each match into the employers or jobTitles list based on the
 * URL params (em / job).
 */
const ITEM_RE =
  /<a\s+role="menuitem"[^>]*href="index\.php\?([^"]+)"[^>]*>\s*([^<]+?)\s*<span class="pull-right">\s*<span class="label label-[a-z]+"[^>]*>\s*Median\s*\$([\d,]+)\s*<\/span>\s*<span class="badge"[^>]*>(\d+)<\/span>/gi;

const ITEM_RE_NO_MEDIAN =
  /<a\s+role="menuitem"[^>]*href="index\.php\?([^"]+)"[^>]*>\s*([^<]+?)\s*<span class="pull-right">\s*<span class="badge"[^>]*>(\d+)<\/span>/gi;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseUrlParams(qs: string): Record<string, string> {
  const decoded = decodeHtmlEntities(qs);
  const out: Record<string, string> = {};
  for (const part of decoded.split("&")) {
    const [k, v = ""] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
  }
  return out;
}

function parseUsd(raw: string): number | null {
  const n = Number.parseInt(raw.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extract the employers + job-titles summaries from the index page HTML.
 * Year and city dropdowns are ignored. Duplicates (same name) are de-duped,
 * keeping the first (largest by site convention) occurrence.
 */
export function parseH1bIndex(html: string): H1bIndexParse {
  const employers = new Map<string, EmployerSummary>();
  const jobTitles = new Map<string, JobTitleSummary>();

  const collect = (
    params: Record<string, string>,
    label: string,
    medianRaw: string | null,
    countRaw: string,
  ) => {
    const count = Number.parseInt(countRaw, 10);
    if (!Number.isFinite(count) || count <= 0) return;
    const median = medianRaw ? parseUsd(medianRaw) : null;
    const cleanLabel = label.replace(/\s+/g, " ").trim();
    if (!cleanLabel) return;

    const em = params.em?.trim() ?? "";
    const job = params.job?.trim() ?? "";
    const city = params.city?.trim() ?? "";

    // Year-dropdown items reuse the original em= but the label is a 4-digit year.
    if (/^\d{4}$/.test(cleanLabel)) return;

    if (em && !job && !city) {
      if (!employers.has(cleanLabel)) {
        employers.set(cleanLabel, {
          name: cleanLabel,
          count,
          medianSalaryUsd: median,
        });
      }
      return;
    }
    if (job && !city) {
      if (!jobTitles.has(cleanLabel)) {
        jobTitles.set(cleanLabel, {
          title: cleanLabel,
          count,
          medianSalaryUsd: median,
        });
      }
    }
  };

  ITEM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ITEM_RE.exec(html))) {
    const params = parseUrlParams(m[1]);
    collect(params, m[2], m[3], m[4]);
  }

  ITEM_RE_NO_MEDIAN.lastIndex = 0;
  while ((m = ITEM_RE_NO_MEDIAN.exec(html))) {
    const params = parseUrlParams(m[1]);
    collect(params, m[2], null, m[3]);
  }

  return {
    employers: Array.from(employers.values()).sort((a, b) => b.count - a.count),
    jobTitles: Array.from(jobTitles.values()).sort((a, b) => b.count - a.count),
  };
}

const CORP_SUFFIXES = new Set([
  "INC",
  "INCORPORATED",
  "LLC",
  "LLP",
  "LP",
  "LTD",
  "LIMITED",
  "CORP",
  "CORPORATION",
  "CO",
  "COMPANY",
  "GMBH",
  "PLC",
  "AG",
  "SA",
  "PLLC",
  "PC",
]);

/**
 * Normalize a company / employer label to a list of comparison tokens.
 * Steps: uppercase, strip punctuation, collapse whitespace, drop trailing
 * legal-entity suffixes. Returns at least one token when the input was
 * non-empty.
 */
export function normalizeCompanyTokens(name: string): string[] {
  const cleaned = name
    .toUpperCase()
    .replace(/[.,'`"\u2018\u2019\u201C\u201D]/g, "")
    .replace(/[^A-Z0-9\s&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(" ").filter(Boolean);
  while (tokens.length > 1) {
    const tail = tokens[tokens.length - 1]!;
    if (CORP_SUFFIXES.has(tail)) {
      tokens.pop();
      continue;
    }
    break;
  }
  return tokens;
}

/**
 * Decide whether a candidate employer name is "the same company" as the
 * submitted query, using prefix word-boundary matching:
 *
 *   query "apple" -> ["APPLE"]                        matches "APPLE INC", "APPLE PROCESSING LLC"
 *                                                     does NOT match "APPLEXUS TECHNOLOGIES INC", "APPLET SYSTEMS LLC"
 *   query "apple american group" -> ["APPLE","AMERICAN","GROUP"]
 *                                                     matches only "APPLE AMERICAN GROUP LLC"
 */
export function isSameCompany(queryName: string, candidateName: string): boolean {
  const q = normalizeCompanyTokens(queryName);
  if (q.length === 0) return false;
  const c = normalizeCompanyTokens(candidateName);
  if (c.length < q.length) return false;
  for (let i = 0; i < q.length; i++) {
    if (c[i] !== q[i]) return false;
  }
  return true;
}
