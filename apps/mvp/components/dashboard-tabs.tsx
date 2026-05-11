"use client";

import { useState } from "react";
import type { CreatorDashboardStats } from "@/lib/actions/creator";
import { CollectorDashboard } from "./collector-dashboard";
import { CreatorDashboard } from "./creator-dashboard";

type CollectorData = {
  collectorProfile: any;
  subscriptions: any[];
  selections: any[];
  currentCycle: any;
};

type Props = {
  isCreator: boolean;
  isCollector: boolean;
  creatorStats: CreatorDashboardStats | null;
  collectorData: CollectorData | null;
  creatorProfile: any;
};

export function DashboardTabs({
  isCreator,
  isCollector,
  creatorStats,
  collectorData,
  creatorProfile,
}: Props) {
  const [activeTab, setActiveTab] = useState<"creator" | "collector">(
    collectorData?.collectorProfile
      ? "collector"
      : creatorProfile
        ? "creator"
        : "collector",
  );

  const tabs = [
    ...(isCreator ? [{ key: "creator" as const, label: "Creator" }] : []),
    ...(isCollector ? [{ key: "collector" as const, label: "Collector" }] : []),
  ];

  return (
    <div>
      {tabs.length > 1 && (
        <div className="mt-8 flex gap-1 rounded-xl bg-neutral-100 p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "creator" && isCreator && (
        <CreatorDashboard
          stats={creatorStats}
          creatorProfile={creatorProfile}
        />
      )}

      {activeTab === "collector" && isCollector && collectorData && (
        <CollectorDashboard data={collectorData} />
      )}
    </div>
  );
}
