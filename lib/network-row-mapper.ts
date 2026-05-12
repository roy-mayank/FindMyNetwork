import type { NetworkEdge, NetworkNode } from "@/lib/network-types";

export function networkNodeToStorage(n: NetworkNode): {
  id: string;
  kind: NetworkNode["kind"];
  label: string;
  payloadJson: string;
} {
  const { id, kind, label } = n;
  const payload: Record<string, unknown> = {};
  if (n.kind === "entity" || n.kind === "company") {
    if (n.subtitle) payload.subtitle = n.subtitle;
  }
  if (n.kind === "company") {
    if (n.website) payload.website = n.website;
    if (n.fundingSummary) payload.fundingSummary = n.fundingSummary;
    if (n.description) payload.description = n.description;
    if (typeof n.purposeLikabilityMatch === "number") {
      payload.purposeLikabilityMatch = n.purposeLikabilityMatch;
    }
    if (n.startupStatus) payload.startupStatus = n.startupStatus;
    if (n.country) payload.country = n.country;
    if (typeof n.internationalHiringScore === "number") {
      payload.internationalHiringScore = n.internationalHiringScore;
    }
    if (n.hiringSignalsSummary) payload.hiringSignalsSummary = n.hiringSignalsSummary;
  }
  if (n.kind === "person") {
    if (n.title) payload.title = n.title;
    if (n.linkedinUrl) payload.linkedinUrl = n.linkedinUrl;
    if (n.alumniUrl) payload.alumniUrl = n.alumniUrl;
    if (n.funFacts) payload.funFacts = n.funFacts;
    if (typeof n.lastOutreachScore === "number") {
      payload.lastOutreachScore = n.lastOutreachScore;
    }
    if (typeof n.internationalHiringScore === "number") {
      payload.internationalHiringScore = n.internationalHiringScore;
    }
    if (n.hiringSignalsSummary) payload.hiringSignalsSummary = n.hiringSignalsSummary;
    if (n.sourceUrl) payload.sourceUrl = n.sourceUrl;
    if (n.sourceType) payload.sourceType = n.sourceType;
    if (n.rawExtract) payload.rawExtract = n.rawExtract;
    if (typeof n.confidence === "number") payload.confidence = n.confidence;
  }
  return { id, kind, label, payloadJson: JSON.stringify(payload) };
}

export function edgeToStorageId(e: NetworkEdge, index: number) {
  return `e-${e.source}-${e.target}-${index}`;
}
