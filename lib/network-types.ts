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
  lastOutreachAt?: string;
  enrichmentStatus?: "none" | "pending" | "enriched" | "error";
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
