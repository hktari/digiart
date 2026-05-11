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

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {error && (
        <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Releases
          </h1>
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
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
            canCreateRelease
              ? "bg-fuchsia-600 hover:bg-fuchsia-700"
              : "bg-muted-foreground/40 cursor-not-allowed pointer-events-none"
          }`}
          aria-disabled={!canCreateRelease}
        >
          + New release
        </Link>
      </div>

      {currentCycle && cycleStatus === "OPEN" && (
        <div className="mb-6">
          <CycleLockCountdown lockDate={currentCycle.lockDate} />
        </div>
      )}

      {currentCycle && cycleStatus === "OPEN" && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-600">
            <strong>Release limits:</strong> {publishedReleasesThisCycle} of{" "}
            {maxReleasesPerCycle} published this cycle · Max{" "}
            {maxArtworksPerRelease} artworks per release
          </p>
        </div>
      )}

      {!currentCycle && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-sm text-yellow-600">
            <strong>No active cycle:</strong> New releases cannot be created at
            this time.
          </p>
        </div>
      )}

      {currentCycle && cycleStatus && cycleStatus !== "OPEN" && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-sm text-yellow-600">
            <strong>Cycle {cycleStatus.toLowerCase()}:</strong> New releases
            cannot be created at this time.
          </p>
        </div>
      )}

      {currentCycle &&
        cycleStatus === "OPEN" &&
        publishedReleasesThisCycle >= maxReleasesPerCycle && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <p className="text-sm text-amber-600">
              <strong>Release limit reached:</strong> You have published{" "}
              {maxReleasesPerCycle} releases this cycle. Create a new release in
              the next cycle.
            </p>
          </div>
        )}

      {releases.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No releases yet.</p>
          <Link
            href="/creator/releases/new"
            className="mt-2 inline-block text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
          >
            Create your first release →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {releases.map((release) => (
            <Link
              key={release.id}
              href={`/creator/releases/${release.id}`}
              className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 hover:border-fuchsia-300 hover:bg-fuchsia-500/5 transition-colors group"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate group-hover:text-fuchsia-600 transition-colors">
                  {release.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {release._count.artworks} artwork
                  {release._count.artworks !== 1 ? "s" : ""}
                  {release._count.selections > 0 && (
                    <>
                      {" "}
                      · {release._count.selections} selection
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
                {release.status.charAt(0) +
                  release.status.slice(1).toLowerCase()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
