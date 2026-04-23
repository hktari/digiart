"use server";

import { db } from "@/lib/db";

export async function getCurrentCycle() {
  return db.subscriptionCycle.findFirst({
    where: {
      status: "OPEN",
    },
    orderBy: {
      lockDate: "asc",
    },
  });
}

export async function getAvailableReleasesForCycle(cycleId: string) {
  return db.release.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ cycleId }, { cycleId: null }],
    },
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
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
