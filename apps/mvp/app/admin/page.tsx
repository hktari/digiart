import Link from "next/link";
import { ProfitMetrics } from "@/components/admin/profit-metrics";
import { computeCycleStatus } from "@/lib/cycle-status";
import { getTimeUntilLock } from "@/lib/cycle-utils";
import { db } from "@/lib/db";
import { calculateProfitMetrics } from "@/lib/profit-metrics";
import { requireAdmin } from "@/lib/roles";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const now = new Date();

  const [currentCycle, totalCycles, activeConstraint, podProvider, profitData] =
    await Promise.all([
      db.subscriptionCycle.findFirst({
        where: {
          selectionOpenDate: { lte: now },
          fulfillmentDate: { gte: now },
        },
        orderBy: { selectionOpenDate: "desc" },
        include: {
          _count: { select: { releases: true, selections: true } },
        },
      }),
      db.subscriptionCycle.count(),
      db.bookletConstraint.findFirst({ where: { isActive: true } }),
      db.podProviderConfig.findFirst({
        where: { provider: "Peecho" },
        include: { _count: { select: { offerings: true } } },
      }),
      calculateProfitMetrics(),
    ]);

  const cycleStatus = currentCycle ? computeCycleStatus(currentCycle) : null;
  const lockCountdown =
    currentCycle && cycleStatus === "OPEN"
      ? getTimeUntilLock(currentCycle.lockDate)
      : null;

  const activeOfferings = podProvider
    ? await db.podOffering.count({
        where: { providerId: podProvider.id, isActive: true },
      })
    : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and quick links
        </p>
      </div>

      {/* Platform Profit Insights */}
      <div className="bg-card border rounded-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Platform Profit
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Financial overview from paid orders and payouts
            </p>
          </div>
          <Link
            href="/admin/payouts"
            className="text-sm text-fuchsia-600 hover:underline"
          >
            View payouts →
          </Link>
        </div>
        <ProfitMetrics data={profitData} />
      </div>

      {/* Current Cycle Highlight */}
      <div className="bg-card border rounded-lg p-8">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">Current Cycle</h2>
          <Link
            href="/admin/cycles"
            className="text-sm text-fuchsia-600 hover:underline"
          >
            Manage cycles →
          </Link>
        </div>

        {currentCycle ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{currentCycle.label}</span>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  cycleStatus === "OPEN"
                    ? "bg-green-500/10 text-green-600"
                    : cycleStatus === "LOCKED"
                      ? "bg-yellow-500/10 text-yellow-600"
                      : cycleStatus === "PROCESSING"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {cycleStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Lock Date
                </p>
                <p className="mt-1 font-semibold text-sm">
                  {new Date(currentCycle.lockDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              {lockCountdown && !lockCountdown.isExpired && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-xs text-amber-600 uppercase tracking-wide">
                    Time to Lock
                  </p>
                  <p className="mt-1 font-semibold text-sm text-amber-700">
                    {lockCountdown.days > 0 && `${lockCountdown.days}d `}
                    {lockCountdown.hours > 0 && `${lockCountdown.hours}h `}
                    {lockCountdown.minutes}m
                  </p>
                </div>
              )}

              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Releases
                </p>
                <p className="mt-1 font-semibold text-sm">
                  {currentCycle._count.releases}
                </p>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Selections
                </p>
                <p className="mt-1 font-semibold text-sm">
                  {currentCycle._count.selections}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted border border-dashed rounded-lg p-6 text-center">
            <p className="text-muted-foreground mb-3">No active cycle.</p>
            <Link
              href="/admin/cycles/new"
              className="inline-flex px-4 py-2 bg-fuchsia-600 text-white text-sm rounded-md hover:bg-fuchsia-700"
            >
              Create cycle
            </Link>
          </div>
        )}
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/cycles"
          className="bg-card border rounded-lg p-8 hover:border-fuchsia-300 hover:shadow-sm transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Total Cycles</p>
              <p className="text-3xl font-bold mt-1">{totalCycles}</p>
            </div>
            <span className="text-2xl">🗓</span>
          </div>
          <p className="mt-3 text-sm text-fuchsia-600 group-hover:underline">
            Manage cycles →
          </p>
        </Link>

        <Link
          href="/admin/booklet-constraints"
          className="bg-card border rounded-lg p-8 hover:border-fuchsia-300 hover:shadow-sm transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Active Constraint</p>
              {activeConstraint ? (
                <p className="text-3xl font-bold mt-1">
                  v{activeConstraint.version}
                </p>
              ) : (
                <p className="text-xl font-bold mt-1 text-destructive">None</p>
              )}
            </div>
            <span className="text-2xl">📐</span>
          </div>
          {activeConstraint && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeConstraint.minPages}–{activeConstraint.maxPages} pages
            </p>
          )}
          <p className="mt-3 text-sm text-fuchsia-600 group-hover:underline">
            Manage constraints →
          </p>
        </Link>

        <Link
          href="/admin/pod"
          className="bg-card border rounded-lg p-8 hover:border-fuchsia-300 hover:shadow-sm transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Active Offerings</p>
              <p className="text-3xl font-bold mt-1">{activeOfferings}</p>
            </div>
            <span className="text-2xl">🖨</span>
          </div>
          {podProvider && (
            <p className="text-sm text-muted-foreground mt-1">
              Peecho ·{" "}
              <span
                className={
                  podProvider.environment === "PRODUCTION"
                    ? "text-green-600"
                    : "text-yellow-600"
                }
              >
                {podProvider.environment}
              </span>
            </p>
          )}
          <p className="mt-3 text-sm text-fuchsia-600 group-hover:underline">
            Manage offerings →
          </p>
        </Link>
      </div>
    </div>
  );
}
