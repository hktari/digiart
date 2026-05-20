import { ArrowRight, Lightbulb, Package, Plus, Target } from "lucide-react";
import Link from "next/link";
import { CycleLockCountdown } from "@/components/cycle-lock-countdown";
import { CycleStatusBadge } from "@/components/cycle-status-badge";
import { getReleases } from "@/lib/actions/releases";
import { computeCycleStatus } from "@/lib/cycle-status";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { db } from "@/lib/db";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-jade-500/10 text-jade-600",
  ARCHIVED: "bg-secondary text-secondary-foreground",
};

export default async function CreatorReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const releases = await getReleases();
  const currentCycle = await getCurrentCycle();
  const cycleStatus = currentCycle ? computeCycleStatus(currentCycle) : null;

  // Get platform limits
  const platformConfig = await db.platformConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const maxReleasesPerCycle = platformConfig?.maxReleasesPerCycle ?? 3;
  const maxArtworksPerRelease = platformConfig?.maxArtworksPerRelease ?? 20;

  // Count published releases in current cycle
  const publishedReleasesThisCycle = currentCycle
    ? releases.filter(
        (r) => r.status === "PUBLISHED" && r.cycleId === currentCycle.id,
      ).length
    : 0;

  const canCreateRelease =
    cycleStatus === "OPEN" && publishedReleasesThisCycle < maxReleasesPerCycle;

  const draftReleases = releases.filter((r) => r.status === "DRAFT");
  const publishedReleases = releases.filter((r) => r.status === "PUBLISHED");
  const hasReleases = releases.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {error && (
        <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your Releases
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curate and publish collections of your artworks
          </p>
          {currentCycle && cycleStatus && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">
                Current cycle:
              </span>
              <CycleStatusBadge status={cycleStatus} />
            </div>
          )}
        </div>
        <Link
          href="/creator/releases/new"
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2 ${
            canCreateRelease
              ? "bg-fuchsia-600 hover:bg-fuchsia-700"
              : "bg-muted-foreground/40 cursor-not-allowed pointer-events-none"
          }`}
          aria-disabled={!canCreateRelease}
        >
          <Plus className="h-4 w-4" />
          New release
        </Link>
      </div>

      {/* Success Guide Cards - Show when cycle is open */}
      {currentCycle && cycleStatus === "OPEN" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Progress Card */}
          <div className="bg-info-bg border border-info-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center">
                <Package className="h-5 w-5 text-fuchsia-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Release Progress
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {publishedReleasesThisCycle} of {maxReleasesPerCycle}{" "}
                  published
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-fuchsia-500 transition-all"
                    style={{
                      width: `${(publishedReleasesThisCycle / maxReleasesPerCycle) * 100}%`,
                    }}
                  />
                </div>
                {publishedReleasesThisCycle < maxReleasesPerCycle && (
                  <p className="text-xs text-info-foreground mt-2">
                    {maxReleasesPerCycle - publishedReleasesThisCycle} more
                    release
                    {maxReleasesPerCycle - publishedReleasesThisCycle === 1
                      ? ""
                      : "s"}{" "}
                    available this cycle
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Curate Card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-beige-100 dark:bg-beige-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-beige-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Curate with Purpose
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Group related artworks into themed releases. Collectors love
                  cohesive collections.
                </p>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-warning-bg border border-warning-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Success Tips
                </h3>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  <li>
                    • Use all {maxReleasesPerCycle} releases for maximum
                    exposure
                  </li>
                  <li>
                    • {maxArtworksPerRelease} artworks per release is ideal
                  </li>
                  <li>
                    • Publish before{" "}
                    {new Date(currentCycle.lockDate).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short" },
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentCycle && cycleStatus === "OPEN" && (
        <div className="mb-6">
          <CycleLockCountdown lockDate={currentCycle.lockDate} />
        </div>
      )}

      {!currentCycle && (
        <div className="mb-6 bg-warning-bg border border-warning-border rounded-lg p-4">
          <p className="text-sm text-warning-foreground">
            <strong>No active cycle:</strong> New releases cannot be created at
            this time. Check back soon for the next cycle.
          </p>
        </div>
      )}

      {currentCycle && cycleStatus && cycleStatus !== "OPEN" && (
        <div className="mb-6 bg-warning-bg border border-warning-border rounded-lg p-4">
          <p className="text-sm text-warning-foreground">
            <strong>Cycle {cycleStatus.toLowerCase()}:</strong> New releases
            cannot be created at this time. The next cycle will open soon.
          </p>
        </div>
      )}

      {currentCycle &&
        cycleStatus === "OPEN" &&
        publishedReleasesThisCycle >= maxReleasesPerCycle && (
          <div className="mb-6 bg-success-bg border border-success-border rounded-lg p-4">
            <p className="text-sm text-success-foreground">
              <strong>Excellent!</strong> You&apos;ve published all{" "}
              {maxReleasesPerCycle} releases this cycle. Your work will reach
              maximum collectors. Next cycle opens soon.
            </p>
          </div>
        )}

      {/* Empty State */}
      {!hasReleases && (
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 mb-4">
            <Package className="h-8 w-8 text-fuchsia-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No releases yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Releases are collections of your artworks that collectors can select
            for their booklets. Create your first release to start reaching
            collectors.
          </p>
          {canCreateRelease && (
            <Link
              href="/creator/releases/new"
              className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
            >
              Create your first release
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* Draft Releases Section */}
      {draftReleases.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Draft Releases ({draftReleases.length})
          </h2>
          <div className="space-y-3">
            {draftReleases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </section>
      )}

      {/* Published Releases Section */}
      {publishedReleases.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-jade-500" />
            Published Releases ({publishedReleases.length})
          </h2>
          <div className="space-y-3">
            {publishedReleases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReleaseCard({ release }: { release: any }) {
  const needsMoreArtworks =
    release.status === "DRAFT" && release._count.artworks < 5;

  return (
    <Link
      href={`/creator/releases/${release.id}`}
      className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 hover:border-fuchsia-300 hover:bg-fuchsia-500/5 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate group-hover:text-fuchsia-600 transition-colors">
            {release.title}
          </p>
          {needsMoreArtworks && (
            <span className="shrink-0 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
              Needs {5 - release._count.artworks} more artwork
              {5 - release._count.artworks === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {release._count.artworks} artwork
          {release._count.artworks !== 1 ? "s" : ""}
          {release._count.selections > 0 && (
            <>
              {" "}
              · {release._count.selections} collector selection
              {release._count.selections !== 1 ? "s" : ""}
            </>
          )}
          {" · "}
          {new Date(release.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <span
        className={`ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[release.status] ?? STATUS_BADGE.DRAFT}`}
      >
        {release.status.charAt(0) + release.status.slice(1).toLowerCase()}
      </span>
    </Link>
  );
}
