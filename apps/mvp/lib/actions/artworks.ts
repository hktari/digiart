"use server";

import type { Artwork } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresignedStorageUrl } from "@/lib/s3";

export interface ArtworkWithThumbnail extends Artwork {
  thumbnailUrl?: string;
}

export async function getCreatorArtworkCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      _count: { select: { artworks: { where: { status: "ACTIVE" } } } },
    },
  });

  return profile?._count.artworks ?? 0;
}

export async function getCreatorArtworks(): Promise<ArtworkWithThumbnail[]> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    redirect("/creator/setup");
  }

  const artworks = await db.artwork.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    artworks.map(async (artwork) => ({
      ...artwork,
      thumbnailUrl: await getPresignedStorageUrl(artwork.storageKey),
    })),
  );
}

export async function archiveArtwork(artworkId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    throw new Error("Creator profile not found");
  }

  // Verify the artwork belongs to this creator
  const artwork = await db.artwork.findFirst({
    where: {
      id: artworkId,
      creatorProfileId: profile.id,
    },
  });

  if (!artwork) {
    throw new Error("Artwork not found");
  }

  await db.artwork.update({
    where: { id: artworkId },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/creator/artworks");
}

export async function reactivateArtwork(artworkId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    throw new Error("Creator profile not found");
  }

  const artwork = await db.artwork.findFirst({
    where: {
      id: artworkId,
      creatorProfileId: profile.id,
    },
  });

  if (!artwork) {
    throw new Error("Artwork not found");
  }

  await db.artwork.update({
    where: { id: artworkId },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/creator/artworks");
}
