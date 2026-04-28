"use server";

import { db } from "@/lib/db";
import type { SubscriptionCycle, Release } from "@prisma/client";

export async function getCurrentCycle(): Promise<SubscriptionCycle | null> {
  return db.subscriptionCycle.findFirst({
    where: {
      status: "OPEN",
    },
    orderBy: {
      lockDate: "asc",
    },
  });
}

export async function getAvailableReleasesForCycle(
  cycleId: string,
): Promise<any[]> {
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
