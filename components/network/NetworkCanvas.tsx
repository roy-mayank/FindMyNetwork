"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";

import { buildReactFlowElements } from "@/lib/graph-layout";
import type { ClusterGroupBy, FlowNodePayload, NetworkData } from "@/lib/network-types";
import { GraphNode } from "@/components/network/nodes/GraphNode";
import { PersonModal } from "@/components/network/PersonModal";

const nodeTypes = { network: GraphNode } satisfies NodeTypes;

type NetworkCanvasProps = {
  data: NetworkData;
  onNetworkUpdated?: () => void;
  clustered: boolean;
  groupBy: ClusterGroupBy;
};

export function NetworkCanvas({
  data,
  onNetworkUpdated,
  clustered,
  groupBy,
}: NetworkCanvasProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildReactFlowElements(data, { clustered, groupBy }),
    [data, clustered, groupBy],
  );

  const [selected, setSelected] = useState<FlowNodePayload | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelected(node.data as FlowNodePayload);
  }, []);

  return (
    <div className="relative h-[min(78vh,820px)] w-full min-h-[480px] overflow-hidden rounded-3xl border-2 border-amber-200/70 bg-gradient-to-b from-white/95 to-sky-50/40 shadow-xl shadow-amber-200/20 ring-1 ring-white/50 dark:border-violet-500/30 dark:from-zinc-900/90 dark:to-violet-950/40 dark:shadow-violet-950/30 dark:ring-violet-500/10">
      <ReactFlow
        key={`${clustered ? "clustered" : "raw"}-${groupBy}-${data.nodes.length}-${data.edges.length}`}
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.35}
        maxZoom={1.4}
        className="rounded-2xl"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          className="!rounded-lg !border !border-zinc-200 dark:!border-zinc-700"
          maskColor="rgba(0,0,0,0.12)"
        />
      </ReactFlow>

      <PersonModal
        node={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onNetworkUpdated={onNetworkUpdated}
      />
    </div>
  );
}
