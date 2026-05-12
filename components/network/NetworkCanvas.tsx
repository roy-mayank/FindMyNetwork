"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";

import { buildReactFlowElements } from "@/lib/graph-layout";
import type {
  ClusterGroupBy,
  FlowNodePayload,
  NetworkData,
  NetworkNode,
} from "@/lib/network-types";
import { GraphNode } from "@/components/network/nodes/GraphNode";
import { PersonModal } from "@/components/network/PersonModal";

const nodeTypes = { network: GraphNode } satisfies NodeTypes;

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  style: { strokeWidth: 1.5, strokeOpacity: 0.85 },
};

type NetworkCanvasProps = {
  data: NetworkData;
  onNetworkUpdated?: () => void;
  clustered: boolean;
  groupBy: ClusterGroupBy;
  /**
   * Intercept clicks on person / company nodes. Return `true` to suppress the
   * default modal (e.g. when navigating to the lists tab instead). Other node
   * kinds (`me`, `entity`, `cluster`) always open the modal.
   */
  onNodeFocus?: (node: NetworkNode) => boolean;
};

export function NetworkCanvas({
  data,
  onNetworkUpdated,
  clustered,
  groupBy,
  onNodeFocus,
}: NetworkCanvasProps) {
  const built = useMemo(
    () => buildReactFlowElements(data, { clustered, groupBy }),
    [data, clustered, groupBy],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);

  useEffect(() => {
    setNodes(built.nodes);
    setEdges(built.edges);
  }, [built, setNodes, setEdges]);

  const [selected, setSelected] = useState<FlowNodePayload | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const payload = node.data as FlowNodePayload;
      if (
        onNodeFocus &&
        (payload.kind === "person" || payload.kind === "company")
      ) {
        if (onNodeFocus(payload as NetworkNode)) return;
      }
      setSelected(payload);
    },
    [onNodeFocus],
  );

  return (
    <div className="relative h-[min(78vh,820px)] w-full min-h-[480px] overflow-hidden rounded-3xl border-2 border-amber-200/70 bg-gradient-to-b from-white/95 to-sky-50/40 shadow-xl shadow-amber-200/20 ring-1 ring-white/50 dark:border-violet-500/30 dark:from-zinc-900/90 dark:to-violet-950/40 dark:shadow-violet-950/30 dark:ring-violet-500/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2}
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
