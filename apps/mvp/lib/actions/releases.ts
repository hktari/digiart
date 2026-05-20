"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { AnalyticsEvents, trackUserEvent } from "@/lib/analytics/events";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueAutoAssignRelease } from "@/lib/queue/auto-assign";
import { getPresignedStorageUrl } from "@/lib/s3";
import { getReleaseTags, setReleaseTags } from "./tags";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireCreatorProfile() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) redirect("/creator/setup");

  return profile.id;
}

async function withThumbnail<T extends { storageKey: string }>(artwork: T) {
  return {
    ...artwork,
    thumbnailUrl: await getPresignedStorageUrl(artwork.storageKey),
  };
}

async function getPlatformLimits() {
  const config = await db.platformConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  return {
    maxArtworksPerRelease: config?.maxArtworksPerRelease ?? 7,
    maxReleasesPerCycle: config?.maxReleasesPerCycle ?? 3,
  };
}

async function countPublishedReleasesInCycle(
  creatorProfileId: string,
  cycleId: string,
): Promise<number> {
  return db.release.count({
    where: {
      creatorProfileId,
      cycleId,
      status: "PUBLISHED",
    },
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getReleases(): Promise<any[]> {
  const creatorProfileId = await requireCreatorProfile();

  const releases = await db.release.findMany({
    where: { creatorProfileId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { artworks: true, selections: true } },
    },
  });

  return releases;
}

export async function getRelease(id: string): Promise<any> {
  const creatorProfileId = await requireCreatorProfile();

  const release = await db.release.findFirst({
    where: { id, creatorProfileId },
    include: {
      artworks: {
        orderBy: { sortOrder: "asc" },
        include: { artwork: true },
      },
      _count: { select: { selections: true } },
    },
  });

  if (!release) return null;

  const tags = await getReleaseTags(id);

  return {
    ...release,
    tags: tags.map((tag) => tag.name),
    artworks: await Promise.all(
      release.artworks.map(async (ra) => ({
        ...ra,
        artwork: await withThumbnail(ra.artwork),
      })),
    ),
  };
}

export async function getCreatorArtworksForRelease(): Promise<any[]> {
  const creatorProfileId = await requireCreatorProfile();

  const artworks = await db.artwork.findMany({
    where: { creatorProfileId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(artworks.map(withThumbnail));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

const releaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().max(1000).optional(),
});

export type SaveReleaseResult =
  | { success: true; releaseId: string }
  | { success: false; errors: Record<string, string> };

export async function createRelease(
  _prevState: unknown,
  formData: FormData,
): Promise<SaveReleaseResult> {
  const creatorProfileId = await requireCreatorProfile();

  const parsed = releaseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as string] = issue.message;
    }
    return { success: false, errors };
  }

  // Check release count limit for current cycle
  const currentCycle = await getCurrentCycle();
  if (currentCycle) {
    const { maxReleasesPerCycle } = await getPlatformLimits();
    const publishedCount = await countPublishedReleasesInCycle(
      creatorProfileId,
      currentCycle.id,
    );
    if (publishedCount >= maxReleasesPerCycle) {
      return {
        success: false,
        errors: {
          _form: `You have reached the maximum of ${maxReleasesPerCycle} releases for this cycle.`,
        },
      };
    }
  }

  const release = await db.release.create({
    data: {
      creatorProfileId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: "DRAFT",
      cycleId: currentCycle?.id ?? null,
    },
  });

  const tagsJson = formData.get("tags");
  if (tagsJson && typeof tagsJson === "string") {
    try {
      const tags = JSON.parse(tagsJson) as string[];
      if (Array.isArray(tags) && tags.length > 0) {
        await setReleaseTags(release.id, tags);
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  const session = await auth();
  if (session?.user?.id) {
    void trackUserEvent(session.user.id, AnalyticsEvents.RELEASE_CREATED, {
      release_id: release.id,
      title: parsed.data.title,
    });
  }

  revalidatePath("/creator/releases");
  return { success: true, releaseId: release.id };
}

export async function updateRelease(
  _prevState: unknown,
  formData: FormData,
): Promise<SaveReleaseResult> {
  const creatorProfileId = await requireCreatorProfile();

  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { success: false, errors: { id: "Missing release ID" } };
  }

  const parsed = releaseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as string] = issue.message;
    }
    return { success: false, errors };
  }

  const existing = await db.release.findFirst({
    where: { id, creatorProfileId },
    select: { id: true, cycleId: true },
  });
  if (!existing) return { success: false, errors: { id: "Release not found" } };

  const { canEditRelease } = await import("@/lib/cycle-utils");
  const canEdit = await canEditRelease(existing.cycleId);
  if (!canEdit) {
    return {
      success: false,
      errors: { cycle: "Cannot edit release - cycle is locked" },
    };
  }

  await db.release.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    },
  });

  const tagsJson = formData.get("tags");
  if (tagsJson && typeof tagsJson === "string") {
    try {
      const tags = JSON.parse(tagsJson) as string[];
      await setReleaseTags(id, tags);
    } catch {
      // Ignore invalid JSON
    }
  }

  revalidatePath("/creator/releases");
  revalidatePath(`/creator/releases/${id}`);
  return { success: true, releaseId: id };
}

export async function setReleaseArtworks(
  releaseId: string,
  artworkIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const creatorProfileId = await requireCreatorProfile();

  const release = await db.release.findFirst({
    where: { id: releaseId, creatorProfileId },
    select: { id: true, status: true, cycleId: true },
  });
  if (!release) return { success: false, error: "Release not found" };
  if (release.status === "PUBLISHED") {
    return { success: false, error: "Cannot edit a published release" };
  }

  const { canEditRelease } = await import("@/lib/cycle-utils");
  const canEdit = await canEditRelease(release.cycleId);
  if (!canEdit) {
    return { success: false, error: "Cannot edit release - cycle is locked" };
  }

  // Check artwork count limit
  const { maxArtworksPerRelease } = await getPlatformLimits();
  if (artworkIds.length > maxArtworksPerRelease) {
    return {
      success: false,
      error: `Maximum ${maxArtworksPerRelease} artworks allowed per release (you selected ${artworkIds.length})`,
    };
  }

  // Verify all artworks belong to this creator
  const artworks = await db.artwork.findMany({
    where: { id: { in: artworkIds }, creatorProfileId },
    select: { id: true },
  });
  if (artworks.length !== artworkIds.length) {
    return { success: false, error: "Some artworks not found" };
  }

  // Prevent adding artworks already in another release in this cycle
  if (release.cycleId && artworkIds.length > 0) {
    const existingReleaseArtworks = await db.releaseArtwork.findFirst({
      where: {
        artworkId: { in: artworkIds },
        release: {
          cycleId: release.cycleId,
          creatorProfileId,
          id: { not: releaseId }, // exclude current release
        },
      },
      include: {
        artwork: { select: { title: true } },
        release: { select: { title: true } },
      },
    });

    if (existingReleaseArtworks) {
      return {
        success: false,
        error: `"${existingReleaseArtworks.artwork.title}" is already part of the release "${existingReleaseArtworks.release.title}" in this cycle`,
      };
    }
  }

  await db.$transaction([
    db.releaseArtwork.deleteMany({ where: { releaseId } }),
    db.releaseArtwork.createMany({
      data: artworkIds.map((artworkId, index) => ({
        releaseId,
        artworkId,
        sortOrder: index,
      })),
    }),
  ]);

  revalidatePath(`/creator/releases/${releaseId}`);
  return { success: true };
}

export async function publishRelease(
  releaseId: string,
): Promise<{ success: boolean; error?: string }> {
  const creatorProfileId = await requireCreatorProfile();

  const release = await db.release.findFirst({
    where: { id: releaseId, creatorProfileId },
    include: { _count: { select: { artworks: true } } },
  });

  if (!release) return { success: false, error: "Release not found" };
  if (release.status === "PUBLISHED") return { success: true };

  // Prevent re-publishing archived releases
  if (release.status === "ARCHIVED") {
    return {
      success: false,
      error:
        "Archived releases cannot be re-published. Create a new release instead.",
    };
  }

  if (release._count.artworks < 5) {
    return {
      success: false,
      error: `Add at least 5 artworks before publishing (currently ${release._count.artworks})`,
    };
  }

  const { canEditRelease } = await import("@/lib/cycle-utils");
  const canEdit = await canEditRelease(release.cycleId);
  if (!canEdit) {
    return {
      success: false,
      error: "Cannot publish release - cycle is locked",
    };
  }

  await db.release.update({
    where: { id: releaseId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  const currentCycle = await getCurrentCycle();
  if (currentCycle) {
    await enqueueAutoAssignRelease({
      releaseId,
      creatorProfileId,
      cycleId: currentCycle.id,
    });
  }

  const publishSession = await auth();
  if (publishSession?.user?.id) {
    void trackUserEvent(
      publishSession.user.id,
      AnalyticsEvents.CREATOR_RELEASE_PUBLISHED,
      { release_id: releaseId, artwork_count: release._count.artworks },
    );
  }

  revalidatePath("/creator/releases");
  revalidatePath(`/creator/releases/${releaseId}`);
  return { success: true };
}

export async function archiveRelease(
  releaseId: string,
): Promise<{ success: boolean; error?: string }> {
  const creatorProfileId = await requireCreatorProfile();

  const release = await db.release.findFirst({
    where: { id: releaseId, creatorProfileId },
    select: { id: true },
  });
  if (!release) return { success: false, error: "Release not found" };

  await db.release.update({
    where: { id: releaseId },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/creator/releases");
  revalidatePath(`/creator/releases/${releaseId}`);
  return { success: true };
}
