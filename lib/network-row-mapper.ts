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
  }
  if (n.kind === "person") {
    if (n.title) payload.title = n.title;
    if (n.linkedinUrl) payload.linkedinUrl = n.linkedinUrl;
    if (n.alumniUrl) payload.alumniUrl = n.alumniUrl;
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
