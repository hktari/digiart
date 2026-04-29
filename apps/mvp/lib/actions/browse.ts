"use server";

import type { Tag } from "@prisma/client";
import { db } from "@/lib/db";
import { getPublicStorageUrl } from "@/lib/s3";

export async function getAllPublishedCreators(
  tagSlug?: string,
): Promise<any[]> {
  const where: {
    status: "PUBLISHED";
    releases?: {
      some: {
        status: "PUBLISHED";
        tags?: {
          some: {
            tag: {
              slug: string;
            };
          };
        };
      };
    };
  } = {
    status: "PUBLISHED",
  };

  if (tagSlug) {
    where.releases = {
      some: {
        status: "PUBLISHED",
        tags: {
          some: {
            tag: {
              slug: tagSlug,
            },
          },
        },
      },
    };
  }

  return db.creatorProfile.findMany({
    where,
    select: {
      id: true,
      slug: true,
      displayName: true,
      avatar: true,
      bio: true,
      _count: {
        select: {
          releases: {
            where: {
              status: "PUBLISHED",
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getAllPublishedReleases(
  tagSlug?: string,
): Promise<any[]> {
  const where: {
    status: "PUBLISHED";
    tags?: {
      some: {
        tag: {
          slug: string;
        };
      };
    };
  } = {
    status: "PUBLISHED",
  };

  if (tagSlug) {
    where.tags = {
      some: {
        tag: {
          slug: tagSlug,
        },
      },
    };
  }

  const releases = await db.release.findMany({
    where,
    include: {
      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          avatar: true,
        },
      },
      artworks: {
        include: {
          artwork: {
            select: {
              id: true,
              title: true,
              storageKey: true,
              orientation: true,
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
        take: 1,
      },
      tags: {
        include: {
          tag: true,
        },
      },
      _count: {
        select: {
          artworks: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform the data to include thumbnailUrl and flatten tags structure
  return releases.map((release) => ({
    ...release,
    artworks: release.artworks.map((artworkRelease) => ({
      ...artworkRelease,
      artwork: {
        ...artworkRelease.artwork,
        thumbnailUrl: getPublicStorageUrl(artworkRelease.artwork.storageKey),
      },
    })),
    tags: release.tags.map((releaseTag) => releaseTag.tag),
  }));
}

export async function getAllTags(): Promise<
  (Tag & { _count: { releaseTags: number } })[]
> {
  return db.tag.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          releaseTags: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}
