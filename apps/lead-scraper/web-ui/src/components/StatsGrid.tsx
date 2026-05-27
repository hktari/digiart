import type { Stats } from "../types";
import { StatCard } from "./StatCard";

interface StatsGridProps {
  stats: Stats | null;
  isLoading: boolean;
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  const statsConfig = [
    { title: "Total Leads", key: "totalLeads" as keyof Stats },
    { title: "Hot Leads", key: "hotLeads" as keyof Stats },
    { title: "Last 24h", key: "last24h" as keyof Stats },
    { title: "Not Contacted", key: "notContacted" as keyof Stats },
    { title: "Contacted", key: "contacted" as keyof Stats },
    { title: "Irrelevant", key: "irrelevant" as keyof Stats },
    { title: "Archived", key: "archived" as keyof Stats },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
      {statsConfig.map((config, index) => (
        <StatCard
          key={config.key}
          title={config.title}
          value={stats ? stats[config.key] : 0}
          isLoading={isLoading}
          delay={index * 0.05}
        />
      ))}
    </div>
  );
}
