export type NodeKind = "me" | "entity" | "company" | "person";

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
};

export type PersonNetworkNode = BaseNetworkNode & {
  kind: "person";
  title?: string;
  linkedinUrl?: string;
  alumniUrl?: string;
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
  source: string;
  target: string;
};

export type NetworkData = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

/** Payload stored on each React Flow node `data` for rendering + modal */
export type FlowNodePayload = NetworkNode;
