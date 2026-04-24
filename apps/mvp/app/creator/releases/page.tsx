import Link from "next/link";
import { CycleLockCountdown } from "@/components/cycle-lock-countdown";
import { CycleStatusBadge } from "@/components/cycle-status-badge";
import { getReleases } from "@/lib/actions/releases";
import { computeCycleStatus } from "@/lib/cycle-status";
import { getCurrentCycle } from "@/lib/cycle-utils";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  PUBLISHED: "bg-jade-100 text-jade-700",
  ARCHIVED: "bg-beige-100 text-beige-600",
};

export default async function CreatorReleasesPage() {
  const releases = await getReleases();
  const currentCycle = await getCurrentCycle();
  const cycleStatus = currentCycle ? computeCycleStatus(currentCycle) : null;
  const canCreateRelease = cycleStatus === "OPEN";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Releases
          </h1>
          {currentCycle && cycleStatus && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-neutral-600">Current cycle:</span>
              <CycleStatusBadge status={cycleStatus} />
            </div>
          )}
        </div>
        <Link
          href="/creator/releases/new"
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
            canCreateRelease
              ? "bg-fuchsia-600 hover:bg-fuchsia-700"
              : "bg-gray-400 cursor-not-allowed pointer-events-none"
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

      {currentCycle && cycleStatus !== "OPEN" && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Cycle {cycleStatus.toLowerCase()}:</strong> New releases
            cannot be created at this time.
          </p>
        </div>
      )}

      {releases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-sm text-neutral-500">No releases yet.</p>
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
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-fuchsia-300 hover:bg-fuchsia-50/20 transition-colors group"
            >
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 truncate group-hover:text-fuchsia-700 transition-colors">
                  {release.title}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
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
