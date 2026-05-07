import fs from "node:fs";
import path from "node:path";

export type EmployerSnapshotRow = {
  employerName: string;
  optTotalStudents?: number;
  optRank?: number;
  h1bApprovalsApprox?: number;
  sourceNote?: string;
};

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "data",
  "h1b-employer-snapshots",
  "employers.json",
);

/**
 * Returns a snapshot row for an employer if `data/h1b-employer-snapshots/employers.json`
 * exists and contains a matching key (see README in that folder).
 */
export function loadEmployerSnapshotRow(normalizedName: string): EmployerSnapshotRow | null {
  const key = normalizedName.trim().toLowerCase();
  if (!key) return null;
  try {
    if (!fs.existsSync(SNAPSHOT_PATH)) return null;
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = (parsed as Record<string, unknown>)[key];
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    const r = record as Record<string, unknown>;
    return {
      employerName: typeof r.employerName === "string" ? r.employerName : normalizedName,
      optTotalStudents: typeof r.optTotalStudents === "number" ? r.optTotalStudents : undefined,
      optRank: typeof r.optRank === "number" ? r.optRank : undefined,
      h1bApprovalsApprox:
        typeof r.h1bApprovalsApprox === "number" ? r.h1bApprovalsApprox : undefined,
      sourceNote: typeof r.sourceNote === "string" ? r.sourceNote : undefined,
    };
  } catch {
    return null;
  }
}
