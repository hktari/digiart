"use client";

import Link from "next/link";
import { Eye, Lock, Plus, Settings, Users } from "lucide-react";
import type { CreatorDashboardStats } from "@/lib/actions/creator";

type Props = {
  stats: CreatorDashboardStats | null;
  creatorProfile: any;
};

export function CreatorDashboard({ stats, creatorProfile }: Props) {
  if (!stats) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-neutral-900">
          No creator profile found.
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Set up your creator profile to see your dashboard.
        </p>
        <Link
          href="/creator/setup"
          className="mt-4 inline-flex text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
        >
          Start creator setup &rarr;
        </Link>
      </div>
    );
  }

  if (!creatorProfile) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-neutral-900">
          Publishing is not enabled on this account yet.
        </p>
        <Link
          href="/account/roles"
          className="mt-4 inline-flex text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
        >
          Enable publishing &rarr;
        </Link>
      </div>
    );
  }

  const churnDelta = stats.newSubscribersThisCycle - stats.churnedThisCycle;

  const payoutDisplay = stats.pendingPayout
    ? `€${Number(stats.pendingPayout.amount).toFixed(2)}`
    : stats.lastConfirmedPayout
      ? `€${Number(stats.lastConfirmedPayout.amount).toFixed(2)}`
      : "—";

  const payoutSubLabel = stats.pendingPayout
    ? "Pending payout"
    : stats.lastConfirmedPayout
      ? `Last paid (${stats.lastConfirmedPayout.cycleLabel})`
      : "No payouts yet";

  return (
    <div className="mt-8 space-y-8">
      {/* Hero stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4 text-fuchsia-500" strokeWidth={1.5} />}
          label="Subscribers"
          value={String(stats.totalSubscribers)}
          accent="fuchsia"
        />
        <StatCard
          icon={
            <span
              className={`text-xs font-bold ${churnDelta >= 0 ? "text-jade-600" : "text-red-500"}`}
            >
              {churnDelta >= 0 ? "+" : ""}
              {churnDelta}
            </span>
          }
          label="New this cycle"
          value={String(stats.newSubscribersThisCycle)}
          subLabel={
            stats.churnedThisCycle > 0
              ? `${stats.churnedThisCycle} churned`
              : undefined
          }
          accent="fuchsia"
        />
        <StatCard
          icon={<Eye className="h-4 w-4 text-ocean-500" strokeWidth={1.5} />}
          label="Selections this cycle"
          value={String(stats.selectionsThisCycle)}
          accent="ocean"
        />
        <StatCard
          icon={
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
              €
            </span>
          }
          label={payoutSubLabel}
          value={payoutDisplay}
          accent={stats.pendingPayout ? "fuchsia" : "neutral"}
        />
      </div>

      {/* Current cycle panel */}
      {stats.currentCycle ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
                Current cycle
              </p>
              <h3 className="mt-1 text-lg font-semibold text-neutral-900">
                {stats.currentCycle.label}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-ocean-50 px-3 py-1.5 text-xs font-medium text-ocean-700 w-fit">
              <Lock className="h-3 w-3" strokeWidth={2} />
              Locks{" "}
              {new Date(stats.currentCycle.lockDate).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Profile views this cycle
              </p>
              <p className="mt-2 text-3xl font-bold text-neutral-900">
                {stats.profileViewsThisCycle}
              </p>
            </div>

            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
                Selections by release
              </p>
              {stats.selectionsBreakdown.length === 0 ? (
                <p className="text-sm text-neutral-500">No selections yet.</p>
              ) : (
                <ul className="space-y-2">
                  {stats.selectionsBreakdown.map((item) => (
                    <li
                      key={item.releaseId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm text-neutral-700 truncate max-w-[200px]">
                        {item.title}
                      </span>
                      <span className="shrink-0 rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-semibold text-fuchsia-700">
                        {item.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">No active cycle open.</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href={creatorProfile ? "/creator/releases/new" : "/creator/setup"}
          className="flex items-start gap-3 rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
        >
          <Plus className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Create release
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Publish into the next booklet cycle.
            </p>
          </div>
        </Link>
        <Link
          href={creatorProfile ? "/creator/releases" : "/creator/setup"}
          className="flex items-start gap-3 rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
        >
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Manage releases
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Review and edit your publishing workflow.
            </p>
          </div>
        </Link>
        <Link
          href={creatorProfile ? "/creator/profile" : "/creator/setup"}
          className="flex items-start gap-3 rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
        >
          <Settings className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Edit profile
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Update collector-facing info and payouts.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subLabel,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subLabel?: string;
  accent: "fuchsia" | "ocean" | "neutral";
}) {
  const accentMap = {
    fuchsia: "bg-fuchsia-50 border-fuchsia-100",
    ocean: "bg-ocean-50 border-ocean-100",
    neutral: "bg-neutral-50 border-neutral-200",
  };

  return (
    <div className={`rounded-2xl border p-5 ${accentMap[accent]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          {label}
        </p>
        <span className="flex h-6 w-6 items-center justify-center">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">
        {value}
      </p>
      {subLabel && (
        <p className="mt-1 text-xs text-neutral-500">{subLabel}</p>
      )}
    </div>
  );
}
