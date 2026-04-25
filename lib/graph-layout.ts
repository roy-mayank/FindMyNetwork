import type { Edge, Node } from "@xyflow/react";
import type { NetworkData, NetworkEdge, NetworkNode } from "@/lib/network-types";

const CENTER = { x: 420, y: 340 };
const R_ENTITY = 150;
const R_COMPANY = 300;
const R_PEOPLE = 100;

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
 * Positions `me` at center; entities and companies on rings from you;
 * people in a small arc around their company.
 */
export function computePositions(data: NetworkData): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const me = data.nodes.find((n) => n.kind === "me");
  if (!me) {
    throw new Error('NetworkData must include exactly one node with kind "me".');
  }

  positions.set(me.id, { ...CENTER });

  const meNb = neighborsOf(me.id, data.edges);
  const entityIds = meNb.filter((id) => data.nodes.find((n) => n.id === id)?.kind === "entity");
  const companyIds = meNb.filter((id) => data.nodes.find((n) => n.id === id)?.kind === "company");

  placeOnRing(entityIds, CENTER.x, CENTER.y, R_ENTITY, -Math.PI / 2, positions);
  placeOnRing(companyIds, CENTER.x, CENTER.y, R_COMPANY, -Math.PI / 2 + 0.35, positions);

  for (const cid of companyIds) {
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

export function buildReactFlowElements(data: NetworkData): {
  nodes: Node[];
  edges: Edge[];
} {
  const positions = computePositions(data);

  const nodes: Node[] = data.nodes.map((n) => {
    const p = positions.get(n.id) ?? CENTER;
    return {
      id: n.id,
      type: "network",
      position: p,
      data: n as NetworkNode & Record<string, unknown>,
    };
  });

  const edges: Edge[] = data.edges.map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    animated: false,
  }));

  return { nodes, edges };
}
