import type { CycleStatus, SubscriptionCycle } from "@prisma/client";
import { AlertCircle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CycleLockedBanner } from "@/components/cycle-locked-banner";
import { ReleaseActions } from "@/components/release-actions";
import { ReleaseArtworkPicker } from "@/components/release-artwork-picker";
import { ReleaseForm } from "@/components/release-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  getCreatorArtworksForRelease,
  getRelease,
  updateRelease,
} from "@/lib/actions/releases";
import { computeCycleStatus } from "@/lib/cycle-status";
import { canEditRelease } from "@/lib/cycle-utils";
import { db } from "@/lib/db";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-jade-500/10 text-jade-600",
  ARCHIVED: "bg-secondary text-secondary-foreground",
};

export default async function CreatorReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [release, allArtworks] = await Promise.all([
    getRelease(id),
    getCreatorArtworksForRelease(),
  ]);

  if (!release) notFound();

  const canEdit = await canEditRelease(release.cycleId);
  const isLocked = release.status !== "DRAFT" || !canEdit;
  const selectedIds = release.artworks.map((ra) => ra.artworkId);

  let cycle: SubscriptionCycle | null = null;
  let cycleStatus: CycleStatus | null = null;
  if (release.cycleId) {
    cycle = await db.subscriptionCycle.findUnique({
      where: { id: release.cycleId },
    });
    if (cycle) {
      cycleStatus = computeCycleStatus(cycle);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/creator/releases">Releases</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg font-bold text-foreground truncate">
                  {release.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[release.status] ?? STATUS_BADGE.DRAFT}`}
          >
            {release.status.charAt(0) + release.status.slice(1).toLowerCase()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {release._count.selections} collector selection
          {release._count.selections !== 1 ? "s" : ""}
          {" · "}created{" "}
          {new Date(release.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Cycle locked banner */}
      {cycle && cycleStatus && cycleStatus !== "OPEN" && (
        <CycleLockedBanner status={cycleStatus} cycleName={cycle.label} />
      )}

      {/* Details form */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Details
        </h2>
        {isLocked ? (
          <div className="space-y-3 rounded-xl border bg-muted p-5">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Title
              </p>
              <p className="text-sm font-medium text-foreground">
                {release.title}
              </p>
            </div>
            {release.description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                  Description
                </p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {release.description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <ReleaseForm
            action={updateRelease}
            initialData={{
              id: release.id,
              title: release.title,
              description: release.description ?? "",
            }}
            submitLabel="Save changes"
          />
        )}
      </section>

      {/* Artwork Guidance Cards for Draft */}
      {release.status === "DRAFT" && !isLocked && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Progress Card */}
            <div
              className={`rounded-xl border p-4 ${
                selectedIds.length >= 5
                  ? "bg-success-bg border-success-border"
                  : "bg-warning-bg border-warning-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedIds.length >= 5
                      ? "bg-jade-100 dark:bg-jade-900/30"
                      : "bg-amber-100 dark:bg-amber-900/30"
                  }`}
                >
                  {selectedIds.length >= 5 ? (
                    <CheckCircle2 className="h-5 w-5 text-jade-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Artwork Requirements
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          selectedIds.length >= 5
                            ? "bg-jade-500"
                            : "bg-amber-500"
                        }`}
                        style={{
                          width: `${Math.min((selectedIds.length / 5) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {selectedIds.length}/5
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedIds.length >= 5
                      ? "✓ Minimum requirement met. Add more for better collector choice!"
                      : `Add ${5 - selectedIds.length} more artwork${5 - selectedIds.length === 1 ? "" : "s"} to publish.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-info-bg border border-info-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-fuchsia-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Success Tips
                  </h3>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Aim for 15-20 artworks per release</li>
                    <li>• Curate around a theme or style</li>
                    <li>• Once published, releases cannot be edited</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Artwork picker */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Artworks
          </h2>
          <span className="text-xs text-muted-foreground">
            {selectedIds.length} selected · click to toggle order
          </span>
        </div>
        <ReleaseArtworkPicker
          releaseId={release.id}
          allArtworks={allArtworks}
          selectedIds={selectedIds}
          disabled={isLocked}
        />
      </section>

      {/* Info Card for Published Releases */}
      {release.status === "PUBLISHED" && (
        <section className="bg-success-bg border border-success-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-success-foreground shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Published and Active
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                This release is visible to subscribers and available for
                selection.
                {release._count.selections > 0 && (
                  <>
                    {" "}
                    <strong className="text-foreground">
                      {release._count.selections} collector
                      {release._count.selections === 1 ? "" : "s"} already
                      selected
                    </strong>{" "}
                    this release for their booklet.
                  </>
                )}
              </p>
              <div className="mt-3 p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">
                    Maximize your reach:
                  </strong>{" "}
                  Create more releases to increase your chances of being
                  selected by collectors. Check your main releases page to see
                  how many releases you can still create this cycle.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Publish / archive */}
      <section className="flex items-center justify-between border-t pt-6">
        <p className="text-sm text-muted-foreground">
          {release.status === "DRAFT" && "Draft — only visible to you."}
          {release.status === "PUBLISHED" &&
            "Published — visible to subscribers."}
          {release.status === "ARCHIVED" && "Archived — no longer visible."}
        </p>
        <ReleaseActions
          releaseId={release.id}
          status={release.status}
          artworkCount={selectedIds.length}
        />
      </section>
    </div>
  );
}
