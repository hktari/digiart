"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { enqueueAutoAssignRelease } from "@/lib/queue/auto-assign";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicStorageUrl } from "@/lib/s3";
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

function withThumbnail<T extends { storageKey: string }>(artwork: T) {
  return { ...artwork, thumbnailUrl: getPublicStorageUrl(artwork.storageKey) };
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
    artworks: release.artworks.map((ra) => ({
      ...ra,
      artwork: withThumbnail(ra.artwork),
    })),
  };
}

export async function getCreatorArtworksForRelease(): Promise<any[]> {
  const creatorProfileId = await requireCreatorProfile();

  const artworks = await db.artwork.findMany({
    where: { creatorProfileId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  return artworks.map(withThumbnail);
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

  const release = await db.release.create({
    data: {
      creatorProfileId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: "DRAFT",
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

  // Verify all artworks belong to this creator
  const artworks = await db.artwork.findMany({
    where: { id: { in: artworkIds }, creatorProfileId },
    select: { id: true },
  });
  if (artworks.length !== artworkIds.length) {
    return { success: false, error: "Some artworks not found" };
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
    data: { status: "PUBLISHED" },
  });

  const currentCycle = await getCurrentCycle();
  if (currentCycle) {
    await enqueueAutoAssignRelease({
      releaseId,
      creatorProfileId,
      cycleId: currentCycle.id,
    });
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
