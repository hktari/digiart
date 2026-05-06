import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get("cursor");
  const take = Math.min(parseInt(searchParams.get("take") || "12", 10), 50);

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

  // Build where clause
  const where: {
    collectorProfileId: string;
    isActive: boolean;
  } = {
    collectorProfileId: collectorProfile.id,
    isActive: true,
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

  const items = await db.collectorCreatorSubscription.findMany({
    where: cursorFilter ? { AND: [where, cursorFilter] } : where,
    include: {
      creatorProfile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          avatar: true,
          bio: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1, // Take one extra to determine if there are more pages
  });

  const hasMore = items.length > take;
  const itemsToReturn = hasMore ? items.slice(0, take) : items;

  const nextCursor =
    hasMore && itemsToReturn.length > 0
      ? encodeCursor(
          itemsToReturn[itemsToReturn.length - 1].createdAt,
          itemsToReturn[itemsToReturn.length - 1].id,
        )
      : null;

  return NextResponse.json({
    items: itemsToReturn,
    nextCursor,
  });
}
