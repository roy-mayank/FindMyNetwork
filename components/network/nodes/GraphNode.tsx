"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNodePayload } from "@/lib/network-types";

const kindClass: Record<FlowNodePayload["kind"], string> = {
  me: "border-violet-400 bg-violet-600 text-white ring-2 ring-violet-300/40",
  entity:
    "border-emerald-500/80 bg-emerald-700 text-white dark:bg-emerald-800",
  company: "border-sky-500/80 bg-sky-700 text-white dark:bg-sky-900",
  person:
    "border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100",
};

export function GraphNode(props: NodeProps) {
  const data = props.data as FlowNodePayload;
  const { selected } = props;
  const palette = kindClass[data.kind];
  const subtitle =
    data.kind === "entity" || data.kind === "company"
      ? data.subtitle
      : undefined;

  return (
    <div
      className={`min-w-[128px] max-w-[220px] cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-semibold shadow-md transition-[box-shadow,transform] select-none hover:shadow-lg active:scale-[0.98] ${palette} ${
        selected
          ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950/10 dark:ring-offset-zinc-950"
          : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-0 !bg-white/40"
      />
      <div className="leading-snug">{data.label}</div>
      {data.kind === "person" && data.title ? (
        <div className="mt-1 line-clamp-2 text-[11px] font-normal opacity-85">
          {data.title}
        </div>
      ) : null}
      {subtitle ? (
        <div className="mt-1 text-[11px] font-normal opacity-80">{subtitle}</div>
      ) : null}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-0 !bg-white/40"
      />
    </div>
  );
}
