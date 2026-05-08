import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/index";
import { nodes } from "@/db/schema";
import {
  isSameCompany,
  parseH1bIndex,
  type EmployerSummary,
  type JobTitleSummary,
} from "@/lib/hiring-signals/h1bdata-parser";
import {
  H1B_SCORE_FORMULA_VERSION,
  buildHiringSummary,
  computeInternationalScore,
} from "@/lib/hiring-signals/h1bdata-score";
import { applyNetworkPatch } from "@/lib/network-repo";

const inputSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  companyName: z.string().min(1, "companyName is required"),
  /** Optional override; defaults to last calendar year (h1bdata.info data lags). */
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const FETCH_TIMEOUT_MS = 10_000;

function ok(body: Record<string, unknown>): Response {
  return Response.json({ ok: true, ...body });
}

function buildSourceUrl(companyName: string, year: number): string {
  const params = new URLSearchParams({
    em: companyName,
    job: "",
    city: "",
    year: String(year),
  });
  return `https://h1bdata.info/index.php?${params.toString()}`;
}

async function fetchH1bIndex(
  url: string,
): Promise<{ html: string } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      return { error: `h1bdata.info responded HTTP ${res.status}` };
    }
    const html = await res.text();
    if (html.length < 1024) {
      return { error: "h1bdata.info returned suspiciously small response" };
    }
    return { html };
  } catch (e) {
    const reason =
      e instanceof Error
        ? e.name === "AbortError"
          ? `timeout after ${FETCH_TIMEOUT_MS}ms`
          : e.message
        : "network error";
    return { error: reason };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { companyId, companyName } = parsed.data;
  // Default to last calendar year — h1bdata.info publishes records with a lag
  // (e.g., asking for 2026 in May 2026 typically returns "0 records was found").
  const year = parsed.data.year ?? new Date().getUTCFullYear() - 1;

  const db = getDb();
  const [companyRow] = await db
    .select({ id: nodes.id, kind: nodes.kind, label: nodes.label })
    .from(nodes)
    .where(eq(nodes.id, companyId))
    .limit(1);
  if (!companyRow || companyRow.kind !== "company") {
    return Response.json(
      { error: "Company not found for that id" },
      { status: 404 },
    );
  }

  const sourceUrl = buildSourceUrl(companyName, year);
  const fetched = await fetchH1bIndex(sourceUrl);
  if ("error" in fetched) {
    return ok({ score: null, matchedCount: 0, reason: fetched.error });
  }

  let parsedIndex: ReturnType<typeof parseH1bIndex>;
  try {
    parsedIndex = parseH1bIndex(fetched.html);
  } catch (e) {
    return ok({
      score: null,
      matchedCount: 0,
      reason: `parse failure: ${e instanceof Error ? e.message : "unknown"}`,
    });
  }

  const matched: EmployerSummary[] = [];
  const excluded: EmployerSummary[] = [];
  for (const e of parsedIndex.employers) {
    (isSameCompany(companyName, e.name) ? matched : excluded).push(e);
  }

  if (matched.length === 0) {
    const summary = buildHiringSummary({
      companyName,
      year,
      matchedEmployers: matched,
      jobTitles: parsedIndex.jobTitles,
    });
    safePersist(() =>
      persistSnapshot(db, companyRow.id, companyRow.label, {
        sourceUrl,
        year,
        matched,
        excluded,
        jobTitles: parsedIndex.jobTitles,
        score: null,
        summary,
      }),
    );
    return ok({
      score: null,
      matchedCount: 0,
      reason: `no h1bdata employer entry matched "${companyName}"`,
    });
  }

  const totalH1bRecords = matched.reduce((sum, e) => sum + e.count, 0);
  const distinctJobTitles = parsedIndex.jobTitles.length;
  const score = computeInternationalScore({ totalH1bRecords, distinctJobTitles });
  const summary = buildHiringSummary({
    companyName,
    year,
    matchedEmployers: matched,
    jobTitles: parsedIndex.jobTitles,
  });

  const persistError = safePersist(() =>
    persistSnapshot(db, companyRow.id, companyRow.label, {
      sourceUrl,
      year,
      matched,
      excluded,
      jobTitles: parsedIndex.jobTitles,
      score,
      summary,
    }),
  );
  if (persistError) {
    return ok({
      score: null,
      matchedCount: matched.length,
      reason: `db write failed: ${persistError}`,
    });
  }

  return ok({ score, matchedCount: matched.length, summary });
}

function safePersist(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "unknown error";
  }
}

type PersistArgs = {
  sourceUrl: string;
  year: number;
  matched: EmployerSummary[];
  excluded: EmployerSummary[];
  jobTitles: JobTitleSummary[];
  score: number | null;
  summary: string;
};

function persistSnapshot(
  db: ReturnType<typeof getDb>,
  companyId: string,
  companyLabel: string,
  args: PersistArgs,
) {
  const totalH1bRecords = args.matched.reduce((sum, e) => sum + e.count, 0);
  const payload: Record<string, unknown> = {
    hiringSignalsSummary: args.summary,
    h1bSnapshot: {
      sourceUrl: args.sourceUrl,
      fetchedAt: new Date().toISOString(),
      year: args.year,
      totalH1bRecords,
      distinctJobTitles: args.jobTitles.length,
      formulaVersion: H1B_SCORE_FORMULA_VERSION,
      score: args.score,
      matchedEmployers: args.matched,
      excludedEmployers: args.excluded.slice(0, 25),
      topJobTitles: args.jobTitles.slice(0, 10),
    },
  };
  if (args.score !== null) {
    payload.internationalHiringScore = args.score;
  }
  applyNetworkPatch(db, {
    nodes: [
      {
        id: companyId,
        kind: "company",
        label: companyLabel,
        payload,
      },
    ],
  });
}
