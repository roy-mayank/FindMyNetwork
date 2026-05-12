"use client";

import { CompaniesList } from "@/components/network/CompaniesList";
import { PeopleList } from "@/components/network/PeopleList";
import type { NetworkData } from "@/lib/network-types";

export type ListTab = "people" | "companies";

type GraphListsProps = {
  data: NetworkData;
  listTab: ListTab;
  focusId?: string;
  onTabChange: (tab: ListTab) => void;
  onNetworkUpdated: () => void;
  onFocusConsumed: () => void;
};

export function GraphLists({
  data,
  listTab,
  focusId,
  onTabChange,
  onNetworkUpdated,
  onFocusConsumed,
}: GraphListsProps) {
  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Lists"
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200/60 bg-white/70 p-2 shadow-sm backdrop-blur-sm dark:border-violet-500/25 dark:bg-zinc-900/50"
      >
        <SubTabButton
          active={listTab === "people"}
          onClick={() => onTabChange("people")}
          label="People"
        />
        <SubTabButton
          active={listTab === "companies"}
          onClick={() => onTabChange("companies")}
          label="Companies"
        />
      </div>
      {listTab === "people" ? (
        <PeopleList
          data={data}
          focusId={focusId}
          onNetworkUpdated={onNetworkUpdated}
          onFocusConsumed={onFocusConsumed}
        />
      ) : (
        <CompaniesList
          data={data}
          focusId={focusId}
          onNetworkUpdated={onNetworkUpdated}
          onFocusConsumed={onFocusConsumed}
        />
      )}
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-md shadow-fuchsia-500/25 hover:brightness-110"
          : "border border-violet-200/70 bg-white/90 text-violet-900 hover:border-violet-400 dark:border-violet-500/30 dark:bg-zinc-900/80 dark:text-violet-100"
      }`}
    >
      {label}
    </button>
  );
}
