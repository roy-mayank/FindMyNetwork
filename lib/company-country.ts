import type { CompanyNetworkNode } from "@/lib/network-types";

function slugKey(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s.length > 0 ? s : "unknown";
}

/**
 * Stable bucket key + human label for clustering and filters.
 * Missing country maps to `unknown` / "Country not set".
 */
export function countryBucketForCompany(
  company: Pick<CompanyNetworkNode, "country">,
): { key: string; label: string } {
  const raw = company.country?.trim();
  if (!raw) return { key: "unknown", label: "Country not set" };
  return { key: slugKey(raw), label: raw.replace(/\s+/g, " ") };
}

/** True when HQ is India (case-insensitive); also accepts ISO alpha-2 `IN`. */
export function isIndiaHqCountry(country?: string): boolean {
  const t = country?.trim().toLowerCase() ?? "";
  if (!t) return false;
  if (t === "india") return true;
  if (t === "in") return true;
  return false;
}
