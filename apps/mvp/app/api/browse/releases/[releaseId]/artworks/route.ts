import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPresignedStorageUrl } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> },
) {
  const { releaseId } = await params;

  const release = await db.release.findFirst({
    where: { id: releaseId, status: "PUBLISHED" },
    include: {
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
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  const artworks = await Promise.all(
    release.artworks.map(async (item) => {
      const imageUrl = await getPresignedStorageUrl(item.artwork.storageKey);
      return {
        id: item.artwork.id,
        title: item.artwork.title,
        orientation: item.artwork.orientation,
        imageUrl,
        thumbnailUrl: imageUrl,
      };
    }),
  );

  return NextResponse.json({ artworks });
}
