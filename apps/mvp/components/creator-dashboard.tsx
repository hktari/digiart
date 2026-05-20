"use client";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  Lock,
  Megaphone,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { CreatorDashboardStats } from "@/lib/actions/creator";

type Props = {
  stats: CreatorDashboardStats | null;
  creatorProfile: any;
  onboardingComplete?: boolean;
};

export function CreatorDashboard({
  stats,
  creatorProfile,
  onboardingComplete,
}: Props) {
  if (!stats) {
    return (
      <Card className="mt-8 border-dashed">
        <CardContent className="p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No creator profile found.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your creator profile to see your dashboard.
          </p>
          <Link
            href="/creator/setup"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:text-primary/80"
          >
            Start creator setup &rarr;
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!creatorProfile) {
    return (
      <Card className="mt-8 border-dashed">
        <CardContent className="p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Publishing is not enabled on this account yet.
          </p>
          <Link
            href="/creator/setup"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:text-primary/80"
          >
            Start creator setup &rarr;
          </Link>
        </CardContent>
      </Card>
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
      {/* Incomplete onboarding banner */}
      {!onboardingComplete && (
        <div className="flex items-start gap-4 rounded-xl border border-warning-border bg-warning-bg px-5 py-4">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground"
            strokeWidth={1.5}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warning-foreground">
              Your profile is not visible to collectors yet
            </p>
            <p className="mt-0.5 text-sm text-warning-foreground/80">
              Upload at least one artwork to publish your profile and start
              attracting subscribers.
            </p>
          </div>
          <Link
            href="/creator/setup"
            className="shrink-0 rounded-lg bg-warning-foreground px-4 py-2 text-sm font-semibold text-warning-bg hover:opacity-90 transition-opacity"
          >
            Complete setup
          </Link>
        </div>
      )}

      {/* Next steps panel — shown after onboarding, before first release */}
      {onboardingComplete && stats.releaseCount === 0 && (
        <div className="rounded-xl border border-info-border bg-info-bg p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-info-foreground/70">
            Getting started
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/creator/releases/new"
              className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5 group"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-sm font-bold text-fuchsia-500">
                1
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-card-foreground">
                  Create or curate a release
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Build your first release so collectors can select it in the
                  next cycle.
                </p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-fuchsia-500 transition-colors" />
            </Link>

            <Link
              href="/creator/share"
              className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5 group"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-sm font-bold text-fuchsia-500">
                2
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-card-foreground">
                  Start promoting
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Get copy-ready blurbs, your referral link, and tips for
                  driving traffic from your channels.
                </p>
              </div>
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-fuchsia-500 transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* Hero stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={
            <Users className="h-4 w-4 text-fuchsia-500" strokeWidth={1.5} />
          }
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
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
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ocean-500">
                  Current cycle
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {stats.currentCycle.label}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-ocean-500/10 px-3 py-1.5 text-xs font-medium text-ocean-400 w-fit">
                <Lock className="h-3 w-3" strokeWidth={2} />
                Locks{" "}
                {new Date(stats.currentCycle.lockDate).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" },
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Profile views this cycle
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {stats.profileViewsThisCycle}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Selections by release
                  </p>
                  {stats.selectionsBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No selections yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {stats.selectionsBreakdown.map((item) => (
                        <li
                          key={item.releaseId}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {item.title}
                          </span>
                          <span className="shrink-0 rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-xs font-semibold text-fuchsia-400">
                            {item.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              No active cycle open.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href={creatorProfile ? "/creator/releases/new" : "/creator/setup"}
          className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5"
        >
          <Plus
            className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500"
            strokeWidth={2}
          />
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Create release
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Publish into the next booklet cycle.
            </p>
          </div>
        </Link>
        <Link
          href={creatorProfile ? "/creator/releases" : "/creator/setup"}
          className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5"
        >
          <Eye
            className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500"
            strokeWidth={1.5}
          />
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Manage releases
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Review and edit your publishing workflow.
            </p>
          </div>
        </Link>
        <Link
          href={creatorProfile ? "/creator/profile" : "/creator/setup"}
          className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5"
        >
          <Settings
            className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500"
            strokeWidth={1.5}
          />
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Edit profile
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
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
    fuchsia: "bg-fuchsia-500/5 border-fuchsia-500/20",
    ocean: "bg-ocean-500/5 border-ocean-500/20",
    neutral: "bg-muted border-border",
  };

  return (
    <div className={`rounded-2xl border p-5 ${accentMap[accent]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {subLabel && (
        <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p>
      )}
    </div>
  );
}
