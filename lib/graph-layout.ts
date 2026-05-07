import type { Edge, Node } from "@xyflow/react";
import {
  assertExactlyOneMeNode,
  DEFAULT_CONNECTION_THROUGH,
  type ClusterFlowNode,
  type ClusterGroupBy,
  type CompanyNetworkNode,
  type FlowNodePayload,
  type GraphViewOptions,
  type NetworkData,
  type NetworkEdge,
  type NetworkNode,
} from "@/lib/network-types";

const CENTER = { x: 420, y: 340 };
const R_ENTITY = 150;
const R_COMPANY_FROM_ENTITY = 120;
const R_COMPANY_FALLBACK = 300;
const R_PEOPLE = 86;
const CLUSTER_OFFSET = { x: 190, y: 40 };

function neighborsOf(nodeId: string, edges: NetworkEdge[]): string[] {
  const out: string[] = [];
  for (const e of edges) {
    if (e.source === nodeId) out.push(e.target);
    if (e.target === nodeId) out.push(e.source);
  }
  return out;
}

function placeOnRing(
  ids: string[],
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  into: Map<string, { x: number; y: number }>,
) {
  const n = Math.max(ids.length, 1);
  ids.forEach((id, i) => {
    const angle = startAngle + (2 * Math.PI * i) / n;
    into.set(id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
}

/**
 * Positions `me` at center; entities on an inner ring from you;
 * companies inside their entity (industry) circle; people near each company.
 */
export function computePositions(data: NetworkData): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  assertExactlyOneMeNode(data.nodes);
  const me = data.nodes.find((n) => n.kind === "me")!;

  positions.set(me.id, { ...CENTER });

  const meNb = neighborsOf(me.id, data.edges);
  const entityIds = meNb.filter((id) => data.nodes.find((n) => n.id === id)?.kind === "entity");
  placeOnRing(entityIds, CENTER.x, CENTER.y, R_ENTITY, -Math.PI / 2, positions);

  const assignedCompanyIds = new Set<string>();
  for (const entityId of entityIds) {
    const entityPos = positions.get(entityId);
    if (!entityPos) continue;

    const companyIds = neighborsOf(entityId, data.edges).filter(
      (id) => data.nodes.find((n) => n.id === id)?.kind === "company",
    );
    if (companyIds.length === 0) continue;
    companyIds.forEach((id) => assignedCompanyIds.add(id));

    const towardCenter = Math.atan2(CENTER.y - entityPos.y, CENTER.x - entityPos.x);
    placeOnRing(
      companyIds,
      entityPos.x,
      entityPos.y,
      R_COMPANY_FROM_ENTITY,
      towardCenter - Math.PI / 3,
      positions,
    );
  }

  const fallbackCompanyIds = meNb.filter(
    (id) =>
      data.nodes.find((n) => n.id === id)?.kind === "company" && !assignedCompanyIds.has(id),
  );
  placeOnRing(
    fallbackCompanyIds,
    CENTER.x,
    CENTER.y,
    R_COMPANY_FALLBACK,
    -Math.PI / 2 + 0.35,
    positions,
  );

  for (const cid of [...assignedCompanyIds, ...fallbackCompanyIds]) {
    const pos = positions.get(cid);
    if (!pos) continue;
    const personIds = neighborsOf(cid, data.edges).filter(
      (id) => data.nodes.find((n) => n.id === id)?.kind === "person",
    );
    const towardCenter = Math.atan2(CENTER.y - pos.y, CENTER.x - pos.x);
    placeOnRing(personIds, pos.x, pos.y, R_PEOPLE, towardCenter - Math.PI / 6, positions);
  }

  const orphanStart = { x: CENTER.x + 420, y: CENTER.y - 200 };
  let orphanIdx = 0;
  for (const n of data.nodes) {
    if (positions.has(n.id)) continue;
    const row = Math.floor(orphanIdx / 3);
    const col = orphanIdx % 3;
    positions.set(n.id, {
      x: orphanStart.x + col * 160,
      y: orphanStart.y + row * 100,
    });
    orphanIdx += 1;
  }

  return positions;
}

function toFlowNode(node: FlowNodePayload, position: { x: number; y: number }): Node {
  return {
    id: node.id,
    type: "network",
    position,
    data: node as FlowNodePayload & Record<string, unknown>,
  };
}

function nodeById(data: NetworkData) {
  return new Map(data.nodes.map((n) => [n.id, n]));
}

function companyToPeople(data: NetworkData) {
  const byCompany = new Map<string, string[]>();
  for (const edge of data.edges) {
    const source = data.nodes.find((n) => n.id === edge.source);
    const target = data.nodes.find((n) => n.id === edge.target);
    if (source?.kind === "company" && target?.kind === "person") {
      const list = byCompany.get(source.id) ?? [];
      list.push(target.id);
      byCompany.set(source.id, list);
    }
  }
  return byCompany;
}

function recencyBucket(lastOutreachAt?: string): string {
  if (!lastOutreachAt) return "Never reached";
  const date = new Date(lastOutreachAt);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return "Reached in last 7 days";
  if (days <= 30) return "Reached in last 30 days";
  if (days <= 90) return "Reached in last 90 days";
  return "Stale (90+ days)";
}

function clusterId(groupBy: ClusterGroupBy, key: string) {
  return `cluster:${groupBy}:${key}`;
}

function clusterNode(
  groupBy: ClusterGroupBy,
  key: string,
  label: string,
  memberIds: string[],
  nodeIndex: Map<string, NetworkNode>,
): ClusterFlowNode {
  const memberLabels = memberIds
    .map((id) => nodeIndex.get(id)?.label)
    .filter((v): v is string => Boolean(v))
    .slice(0, 10);
  return {
    id: clusterId(groupBy, key),
    kind: "cluster",
    label,
    groupBy,
    groupKey: key,
    count: memberIds.length,
    memberIds,
    memberLabels,
  };
}

function buildIndustryClusterElements(
  data: NetworkData,
  positions: Map<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const byId = nodeById(data);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const usedMembers = new Set<string>();
  const usedAnchors = new Set<string>();
  const companyPeople = companyToPeople(data);

  for (const entity of data.nodes.filter((n) => n.kind === "entity")) {
    const companies = neighborsOf(entity.id, data.edges).filter(
      (id) => byId.get(id)?.kind === "company",
    );
    const people = companies.flatMap((cid) => companyPeople.get(cid) ?? []);
    const memberIds = [...new Set([...companies, ...people])];
    if (memberIds.length === 0) continue;

    usedAnchors.add(entity.id);
    memberIds.forEach((id) => usedMembers.add(id));
    const anchorPos = positions.get(entity.id) ?? CENTER;
    const cluster = clusterNode(
      "industry",
      entity.id,
      `${entity.label} cluster`,
      memberIds,
      byId,
    );
    nodes.push(toFlowNode(entity, anchorPos));
    nodes.push(
      toFlowNode(cluster, {
        x: anchorPos.x + CLUSTER_OFFSET.x,
        y: anchorPos.y + CLUSTER_OFFSET.y,
      }),
    );
    edges.push({
      id: `e-${entity.id}-${cluster.id}`,
      source: entity.id,
      target: cluster.id,
      animated: false,
    });
  }

  for (const n of data.nodes) {
    if (n.kind === "me") {
      nodes.push(toFlowNode(n, positions.get(n.id) ?? CENTER));
      usedAnchors.add(n.id);
      continue;
    }
    if (usedAnchors.has(n.id) || usedMembers.has(n.id)) continue;
    nodes.push(toFlowNode(n, positions.get(n.id) ?? CENTER));
  }

  for (const e of data.edges) {
    if (usedMembers.has(e.source) || usedMembers.has(e.target)) continue;
    edges.push({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: false,
    });
  }

  return { nodes, edges };
}

function buildCompanyClusterElements(
  data: NetworkData,
  positions: Map<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const byId = nodeById(data);
  const nodes: Node[] = data
    .nodes
    .filter((n) => n.kind !== "person")
    .map((n) => toFlowNode(n, positions.get(n.id) ?? CENTER));
  const edges: Edge[] = data.edges
    .filter((e) => byId.get(e.source)?.kind !== "person" && byId.get(e.target)?.kind !== "person")
    .map((e, i) => ({
      id: `e-${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      animated: false,
    }));

  const peopleByCompany = companyToPeople(data);
  for (const [companyId, personIds] of peopleByCompany.entries()) {
    if (personIds.length === 0) continue;
    const company = byId.get(companyId);
    if (!company || company.kind !== "company") continue;
    const companyPos = positions.get(companyId) ?? CENTER;
    const cluster = clusterNode(
      "company",
      companyId,
      `${company.label} people`,
      [...new Set(personIds)],
      byId,
    );
    nodes.push(
      toFlowNode(cluster, {
        x: companyPos.x + CLUSTER_OFFSET.x,
        y: companyPos.y + CLUSTER_OFFSET.y,
      }),
    );
    edges.push({
      id: `e-${companyId}-${cluster.id}`,
      source: companyId,
      target: cluster.id,
      animated: false,
    });
  }

  return { nodes, edges };
}

function buildOutreachClusterElements(
  data: NetworkData,
  positions: Map<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const byId = nodeById(data);
  const peopleByCompany = companyToPeople(data);
  const nodes: Node[] = data
    .nodes
    .filter((n) => n.kind !== "person")
    .map((n) => toFlowNode(n, positions.get(n.id) ?? CENTER));
  const edges: Edge[] = data.edges
    .filter((e) => byId.get(e.source)?.kind !== "person" && byId.get(e.target)?.kind !== "person")
    .map((e, i) => ({
      id: `e-${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      animated: false,
    }));

  for (const [companyId, personIds] of peopleByCompany.entries()) {
    const companyPos = positions.get(companyId) ?? CENTER;
    const buckets = new Map<string, string[]>();
    for (const personId of personIds) {
      const node = byId.get(personId);
      if (!node || node.kind !== "person") continue;
      const key = recencyBucket(node.lastOutreachAt);
      const list = buckets.get(key) ?? [];
      list.push(personId);
      buckets.set(key, list);
    }

    let idx = 0;
    for (const [bucket, bucketMembers] of buckets.entries()) {
      const cluster = clusterNode(
        "outreach",
        `${companyId}:${bucket.toLowerCase().replace(/\s+/g, "_")}`,
        `${bucket}`,
        bucketMembers,
        byId,
      );
      nodes.push(
        toFlowNode(cluster, {
          x: companyPos.x + CLUSTER_OFFSET.x + idx * 28,
          y: companyPos.y + CLUSTER_OFFSET.y + idx * 28,
        }),
      );
      edges.push({
        id: `e-${companyId}-${cluster.id}`,
        source: companyId,
        target: cluster.id,
        animated: false,
      });
      idx += 1;
    }
  }

  return { nodes, edges };
}

function startupBucketKey(n: CompanyNetworkNode): "startup" | "established" | "unknown" {
  if (n.startupStatus === "startup") return "startup";
  if (n.startupStatus === "established") return "established";
  return "unknown";
}

/** Group companies (and their employees) by startup vs established for scoring-oriented views. */
function buildStartupClusterElements(
  data: NetworkData,
  positions: Map<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const byId = nodeById(data);
  const companyPeople = companyToPeople(data);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const usedMembers = new Set<string>();
  const usedAnchors = new Set<string>();

  const bucketLabels: Record<"startup" | "established" | "unknown", string> = {
    startup: "Startup orgs & people",
    established: "Established orgs & people",
    unknown: "Company type not set",
  };
  const bucketKeys = ["startup", "established", "unknown"] as const;
  const membersByKey = new Map<(typeof bucketKeys)[number], Set<string>>();
  for (const k of bucketKeys) membersByKey.set(k, new Set());

  for (const n of data.nodes) {
    if (n.kind !== "company") continue;
    const key = startupBucketKey(n);
    const set = membersByKey.get(key)!;
    set.add(n.id);
    for (const pid of companyPeople.get(n.id) ?? []) set.add(pid);
  }

  const me = data.nodes.find((x) => x.kind === "me");
  const mePos = me ? (positions.get(me.id) ?? CENTER) : CENTER;
  if (me) {
    nodes.push(toFlowNode(me, mePos));
    usedAnchors.add(me.id);
  }

  const activeBuckets = bucketKeys.filter((k) => (membersByKey.get(k)?.size ?? 0) > 0);
  const nBuckets = Math.max(activeBuckets.length, 1);
  let idx = 0;
  for (const key of activeBuckets) {
    const memberIds = [...(membersByKey.get(key) ?? new Set())];
    memberIds.forEach((id) => usedMembers.add(id));
    const cluster = clusterNode("startup", key, bucketLabels[key], memberIds, byId);
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / nBuckets;
    const radius = 300;
    nodes.push(
      toFlowNode(cluster, {
        x: mePos.x + radius * Math.cos(angle),
        y: mePos.y + radius * Math.sin(angle),
      }),
    );
    if (me) {
      edges.push({
        id: `e-${me.id}-${cluster.id}`,
        source: me.id,
        target: cluster.id,
        animated: false,
      });
    }
    idx += 1;
  }

  for (const n of data.nodes) {
    if (n.kind === "me") continue;
    if (usedAnchors.has(n.id) || usedMembers.has(n.id)) continue;
    nodes.push(toFlowNode(n, positions.get(n.id) ?? CENTER));
  }

  for (const e of data.edges) {
    if (usedMembers.has(e.source) || usedMembers.has(e.target)) continue;
    edges.push({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: false,
    });
  }

  return { nodes, edges };
}

function buildClusteredElements(
  data: NetworkData,
  groupBy: ClusterGroupBy,
  positions: Map<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  if (groupBy === "industry") return buildIndustryClusterElements(data, positions);
  if (groupBy === "company") return buildCompanyClusterElements(data, positions);
  if (groupBy === "startup") return buildStartupClusterElements(data, positions);
  return buildOutreachClusterElements(data, positions);
}

export function buildReactFlowElements(
  data: NetworkData,
  options: GraphViewOptions = { clustered: false, groupBy: "industry" },
): {
  nodes: Node[];
  edges: Edge[];
} {
  const positions = computePositions(data);
  if (options.clustered) {
    return buildClusteredElements(data, options.groupBy, positions);
  }

  const nodes: Node[] = data.nodes.map((n) => toFlowNode(n, positions.get(n.id) ?? CENTER));

  const companyPersonEdgeLabel = (e: NetworkEdge): string | undefined => {
    const src = data.nodes.find((n) => n.id === e.source);
    const tgt = data.nodes.find((n) => n.id === e.target);
    if (src?.kind !== "company" || tgt?.kind !== "person") return undefined;
    return e.connectionThrough ?? DEFAULT_CONNECTION_THROUGH;
  };

  const edges: Edge[] = data.edges.map((e, i) => ({
    id: e.id ?? `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    animated: false,
    label: companyPersonEdgeLabel(e),
    labelStyle: { fontSize: 10, fill: "#4c1d95", fontWeight: 600 },
    labelBgStyle: { fill: "#fef9c3", fillOpacity: 0.92 },
    labelShowBg: true,
  }));

  return { nodes, edges };
}
