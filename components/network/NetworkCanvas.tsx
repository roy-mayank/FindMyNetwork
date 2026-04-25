"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useMemo, useState } from "react";
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";

import { buildReactFlowElements } from "@/lib/graph-layout";
import type { NetworkData, NetworkNode } from "@/lib/network-types";
import { GraphNode } from "@/components/network/nodes/GraphNode";
import { PersonModal } from "@/components/network/PersonModal";

const nodeTypes = { network: GraphNode } satisfies NodeTypes;

type NetworkCanvasProps = {
  data: NetworkData;
  onNetworkUpdated?: () => void;
};

export function NetworkCanvas({ data, onNetworkUpdated }: NetworkCanvasProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildReactFlowElements(data),
    [data],
  );

  const [nodes, setNodes] = useState(initialNodes);
  const [edges] = useState(initialEdges);
  const [selected, setSelected] = useState<NetworkNode | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelected(node.data as NetworkNode);
  }, []);

  return (
    <div className="relative h-[min(78vh,820px)] w-full min-h-[480px] rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) =>
          setNodes((nds) => applyNodeChanges(changes, nds))
        }
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
