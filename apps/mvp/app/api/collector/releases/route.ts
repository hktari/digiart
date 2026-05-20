import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { db } from "@/lib/db";
import { getPresignedStorageUrl, resolveAvatarUrl } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get("cursor");
  const take = Math.min(parseInt(searchParams.get("take") || "12", 10), 50);
  const cycleId = searchParams.get("cycleId");

  if (!cycleId) {
    return NextResponse.json({ error: "cycleId is required" }, { status: 400 });
  }

  const cursor = decodeCursor(cursorParam);

  if (cursorParam && !cursor) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  // Get collector profile
  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!collectorProfile) {
    return NextResponse.json(
      { error: "Collector profile not found" },
      { status: 404 },
    );
  }

  // Get subscribed creator IDs for this collector
  const subscriptions = await db.collectorCreatorSubscription.findMany({
    where: {
      collectorProfileId: collectorProfile.id,
      isActive: true,
    },
    select: {
      creatorProfileId: true,
    },
  });

  const subscribedCreatorIds = subscriptions.map((s) => s.creatorProfileId);

  // Build where clause
  const where: {
    status: "PUBLISHED";
    creatorProfileId: { in: string[] };
  } = {
    status: "PUBLISHED",
    creatorProfileId: { in: subscribedCreatorIds },
  };

  // Build cursor filter for stable ordering
  const cursorFilter = cursor
    ? {
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          {
            AND: [
              { createdAt: new Date(cursor.createdAt) },
              { id: { lt: cursor.id } },
            ],
          },
        ],
      }
    : undefined;

  const items = await db.release.findMany({
    where: cursorFilter ? { AND: [where, cursorFilter] } : where,
    select: {
      id: true,
      title: true,
      description: true,
      artworkLimit: true,
      createdAt: true,
      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          avatar: true,
        },
      },
      artworks: {
        select: {
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
        select: {
          tag: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
      _count: {
        select: {
          artworks: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1, // Take one extra to determine if there are more pages
  });

  // Exclude releases at max capacity
  const availableItems = items.filter(
    (release) => release._count.artworks < release.artworkLimit,
  );

  const hasMore = availableItems.length > take;
  const itemsToReturn = hasMore
    ? availableItems.slice(0, take)
    : availableItems;

  const nextCursor =
    hasMore && itemsToReturn.length > 0
      ? encodeCursor(
          itemsToReturn[itemsToReturn.length - 1].createdAt,
          itemsToReturn[itemsToReturn.length - 1].id,
        )
      : null;

  const transformedItems = await Promise.all(
    itemsToReturn.map(async (release) => ({
      ...release,
      creatorProfile: {
        ...release.creatorProfile,
        avatar: release.creatorProfile.avatar
          ? await resolveAvatarUrl(release.creatorProfile.avatar)
          : null,
      },
      artworks: await Promise.all(
        release.artworks.map(async (artworkRelease) => ({
          ...artworkRelease,
          artwork: {
            ...artworkRelease.artwork,
            thumbnailUrl: await getPresignedStorageUrl(
              artworkRelease.artwork.storageKey,
            ),
          },
        })),
      ),
    })),
  );

  return NextResponse.json({
    items: transformedItems,
    nextCursor,
  });
}
