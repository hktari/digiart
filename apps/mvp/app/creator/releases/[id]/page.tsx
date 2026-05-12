import type { CycleStatus, SubscriptionCycle } from "@prisma/client";
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
