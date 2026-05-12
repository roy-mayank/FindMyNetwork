/** Default link type on company → person edges (customize per person in collection). */
export const DEFAULT_CONNECTION_THROUGH = "Cold approach";

export type NodeKind = "me" | "entity" | "company" | "person";
export type ClusterGroupBy =
  | "industry"
  | "company"
  | "outreach"
  | "startup"
  | "country";

/** Used for scoring and graph clustering (startup vs mature org). */
export type CompanyStartupStatus = "startup" | "established";

export type BaseNetworkNode = {
  id: string;
  label: string;
  kind: NodeKind;
};

export type MeNetworkNode = BaseNetworkNode & {
  kind: "me";
};

export type EntityNetworkNode = BaseNetworkNode & {
  kind: "entity";
  subtitle?: string;
};

export type CompanyNetworkNode = BaseNetworkNode & {
  kind: "company";
  subtitle?: string;
  /** From `company_profile` + latest funding context */
  website?: string;
  fundingSummary?: string;
  /** Optional free text: fun fact or short description */
  description?: string;
  /** 1–5 how well the company matches purpose / likability (stored in payload) */
  purposeLikabilityMatch?: number;
  /** Whether the company behaves like a startup for scoring / clustering */
  startupStatus?: CompanyStartupStatus;
  /** HQ / registration country (free text; used for clustering and filters) */
  country?: string;
  /** 0–100 from LLM + cited hiring artifacts (payload) */
  internationalHiringScore?: number;
  hiringSignalsSummary?: string;
};

export type PersonNetworkNode = BaseNetworkNode & {
  kind: "person";
  title?: string;
  linkedinUrl?: string;
  alumniUrl?: string;
  /** Informal facts for outreach (payload) */
  funFacts?: string;
  /** Subjective score after last outreach, e.g. 0–10 (payload) */
  lastOutreachScore?: number;
  notes?: string;
  email?: string;
  secondaryEmail?: string;
  directoryProfileUrl?: string;
  verificationStatus?: "unverified" | "verified" | "bounced" | "unknown";
  sourceUrl?: string;
  sourceType?: string;
  confidence?: number;
  rawExtract?: string;
  lastAttemptAt?: string;
  lastOutreachAt?: string;
  enrichmentStatus?: "none" | "pending" | "enriched" | "error";
  /** 0–100 from LLM + cited hiring artifacts (payload) */
  internationalHiringScore?: number;
  hiringSignalsSummary?: string;
  /** UPenn graduate — adds a fixed outreach score bump (not toggleable). */
  pennGrad?: boolean;
};

export type EmailDraft = {
  id: string;
  personId: string;
  draftType: "short" | "detailed" | "follow_up";
  subject: string;
  body: string;
  profileVersion?: string;
  createdAt: string;
};

export type NetworkNode =
  | MeNetworkNode
  | EntityNetworkNode
  | CompanyNetworkNode
  | PersonNetworkNode;

export type NetworkEdge = {
  /** DB edge id when loaded from SQLite */
  id?: string;
  source: string;
  target: string;
  /** Company → person: how you relate (default cold outreach). Stored on `edges`. */
  connectionThrough?: string;
};

/**
 * Full graph payload from the API / repo. Invariant: {@link assertExactlyOneMeNode} — exactly one node has
 * `kind: "me"` (canonical id is usually `"me"`).
 */
export type NetworkData = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

/** Throws unless `nodes` contains exactly one `kind: "me"` entry. */
export function assertExactlyOneMeNode(nodes: NetworkNode[]): void {
  const meCount = nodes.reduce((acc, n) => acc + (n.kind === "me" ? 1 : 0), 0);
  if (meCount !== 1) {
    throw new Error(
      `NetworkData must include exactly one node with kind "me" (found ${meCount}).`,
    );
  }
}

export type ClusterFlowNode = {
  id: string;
  kind: "cluster";
  label: string;
  groupBy: ClusterGroupBy;
  groupKey: string;
  count: number;
  memberIds: string[];
  memberLabels: string[];
};

/** Payload stored on each React Flow node `data` for rendering + modal */
export type FlowNodePayload = NetworkNode | ClusterFlowNode;

export type GraphViewOptions = {
  clustered: boolean;
  groupBy: ClusterGroupBy;
};
