import { type NextRequest, NextResponse } from "next/server";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { db } from "@/lib/db";
import { getPublicStorageUrl } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get("cursor");
  const take = Math.min(parseInt(searchParams.get("take") || "12", 10), 50);

  const cursor = decodeCursor(cursorParam);

  if (cursorParam && !cursor) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  // Get creator profile
  const creatorProfile = await db.creatorProfile.findUnique({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!creatorProfile) {
    return NextResponse.json({ items: [], nextCursor: null });
  }

  // Build where clause - only published releases
  const where: {
    creatorProfileId: string;
    status: "PUBLISHED";
  } = {
    creatorProfileId: creatorProfile.id,
    status: "PUBLISHED",
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1, // Take one extra to determine if there are more pages
  });

  const hasMore = items.length > take;
  const itemsToReturn = hasMore ? items.slice(0, take) : items;

  // Transform the data to include thumbnailUrl and flatten tags structure
  const transformedItems = itemsToReturn.map((release) => ({
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

  const nextCursor =
    hasMore && itemsToReturn.length > 0
      ? encodeCursor(
          itemsToReturn[itemsToReturn.length - 1].createdAt,
          itemsToReturn[itemsToReturn.length - 1].id,
        )
      : null;

  return NextResponse.json({
    items: transformedItems,
    nextCursor,
  });
}
