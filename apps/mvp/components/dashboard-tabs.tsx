"use client";

import { useState } from "react";
import Link from "next/link";
import type { CreatorDashboardStats } from "@/lib/actions/creator";
import { CreatorDashboard } from "./creator-dashboard";
import { CollectorDashboard } from "./collector-dashboard";

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
  nextActions: Array<{ title: string; description: string; href: string }>;
};

export function DashboardTabs({
  isCreator,
  isCollector,
  creatorStats,
  collectorData,
  creatorProfile,
  nextActions,
}: Props) {
  const [activeTab, setActiveTab] = useState<"creator" | "collector">(
    isCreator ? "creator" : "collector",
  );

  const tabs = [
    ...(isCreator ? [{ key: "creator" as const, label: "Creator" }] : []),
    ...(isCollector ? [{ key: "collector" as const, label: "Collector" }] : []),
  ];

  return (
    <div>
      {nextActions.length > 0 && (
        <section className="rounded-2xl border border-beige-200 bg-beige-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Next actions
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Prioritized from your current setup and cycle state.
              </p>
            </div>
            <div className="grid flex-1 gap-3 lg:max-w-3xl lg:grid-cols-2">
              {nextActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="rounded-xl border border-beige-200 bg-white px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
                >
                  <p className="text-sm font-semibold text-neutral-900">
                    {action.title}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
