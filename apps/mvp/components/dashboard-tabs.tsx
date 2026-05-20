"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CreatorDashboardStats } from "@/lib/actions/creator";
import { CollectorDashboard } from "./collector-dashboard";
import { CreatorDashboard } from "./creator-dashboard";

type CheckoutIntentData = {
  orderedManually: boolean;
  orderedAt: string | null;
  retailTotalAmount: number | null;
  committedAt: string | null;
};

type CollectorData = {
  collectorProfile: any;
  subscriptions: any[];
  selections: any[];
  currentCycle: any;
  checkoutIntent: CheckoutIntentData | null;
};

type Props = {
  isCreator: boolean;
  isCollector: boolean;
  creatorStats: CreatorDashboardStats | null;
  collectorData: CollectorData | null;
  creatorProfile: any;
  creatorOnboardingComplete: boolean;
};

export function DashboardTabs({
  isCreator,
  isCollector,
  creatorStats,
  collectorData,
  creatorProfile,
  creatorOnboardingComplete,
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

  if (tabs.length <= 1) {
    return (
      <>
        {isCreator && (
          <CreatorDashboard
            stats={creatorStats}
            creatorProfile={creatorProfile}
            onboardingComplete={creatorOnboardingComplete}
          />
        )}
        {isCollector && collectorData && (
          <CollectorDashboard data={collectorData} />
        )}
      </>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "creator" | "collector")}
      className="mt-8"
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="creator" className="mt-6">
        {isCreator && (
          <CreatorDashboard
            stats={creatorStats}
            creatorProfile={creatorProfile}
            onboardingComplete={creatorOnboardingComplete}
          />
        )}
      </TabsContent>
      <TabsContent value="collector" className="mt-6">
        {isCollector && collectorData && (
          <CollectorDashboard data={collectorData} />
        )}
      </TabsContent>
    </Tabs>
  );
}
