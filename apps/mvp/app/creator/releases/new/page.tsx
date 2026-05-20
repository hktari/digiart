export const dynamic = "force-dynamic";

import { Package, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { EnhancedReleaseForm } from "@/components/enhanced-release-form";
import { auth } from "@/lib/auth";
import { computeCycleStatus } from "@/lib/cycle-status";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { db } from "@/lib/db";
import { getPresignedStorageUrl } from "@/lib/s3";

export default async function CreatorReleaseNewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const currentCycle = await getCurrentCycle();
  const cycleStatus = currentCycle ? computeCycleStatus(currentCycle) : null;

  if (!currentCycle || cycleStatus !== "OPEN") {
    const errorMessage = !currentCycle
      ? "No active cycle available"
      : `Cycle ${cycleStatus?.toLowerCase()}: New releases cannot be created at this time`;
    redirect(`/creator/releases?error=${encodeURIComponent(errorMessage)}`);
  }

  // Get creator profile
  const creatorProfile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!creatorProfile) {
    redirect("/creator/setup");
  }

  // Get existing artworks for selection
  const artworks = await db.artwork.findMany({
    where: { creatorProfileId: creatorProfile.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, storageKey: true },
  });

  const existingArtworks = await Promise.all(
    artworks.map(async (a) => ({
      id: a.id,
      title: a.title,
      thumbnailUrl: await getPresignedStorageUrl(a.storageKey),
    })),
  );

  // Get platform limits
  const platformConfig = await db.platformConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const maxArtworksPerRelease = platformConfig?.maxArtworksPerRelease ?? 20;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center">
            <Package className="h-5 w-5 text-fuchsia-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create New Release
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg">
          Curate a collection of your artworks for collectors to select. You can
          choose from your existing collection or upload new pieces.
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-info-bg border border-info-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-info-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Publishing deadline
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Releases must be published before{" "}
              <strong className="text-foreground">
                {new Date(currentCycle.lockDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>{" "}
              to be included in this cycle&apos;s booklets.
            </p>
          </div>
        </div>
      </div>

      <EnhancedReleaseForm
        existingArtworks={existingArtworks}
        maxArtworksPerRelease={maxArtworksPerRelease}
        lockDate={currentCycle.lockDate}
      />
    </div>
  );
}
