"use server";

import { db } from "@/lib/db";
import { getPublicStorageUrl } from "@/lib/s3";

export async function getPublishedReleases(tagSlugs?: string[]) {
  const where = {
    status: "PUBLISHED" as const,
    ...(tagSlugs && tagSlugs.length > 0
      ? {
          tags: {
            some: {
              tag: {
                slug: { in: tagSlugs },
              },
            },
          },
        }
      : {}),
  };

  const releases = await db.release.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      creatorProfile: {
        select: {
          displayName: true,
          slug: true,
          avatar: true,
        },
      },
      artworks: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        include: { artwork: true },
      },
      tags: {
        include: { tag: true },
      },
      _count: { select: { artworks: true } },
    },
  });

  return releases.map((release) => ({
    ...release,
    artworks: release.artworks.map((ra) => ({
      ...ra,
      artwork: {
        ...ra.artwork,
        thumbnailUrl: getPublicStorageUrl(ra.artwork.storageKey),
      },
    })),
    tags: release.tags.map((rt) => rt.tag),
  }));
}
