import {
  DEFAULT_PAGE_FORMAT,
  gradePlate,
  orientationFromPixels,
  PAGE_DIMENSIONS,
  type PlateGrade,
  plateDpi,
} from "@printfeed/print-geometry";
import { Queue } from "bullmq";
import { db } from "@/lib/db";

const PAGE = PAGE_DIMENSIONS[DEFAULT_PAGE_FORMAT];

export interface CollectionPlate {
  id: string;
  handle: string;
  grade: PlateGrade;
  dpi: number;
}

export interface CollectionReadiness {
  total: number;
  ok: number;
  marginal: number;
  rejected: number;
  plates: CollectionPlate[];
}

/**
 * Score one collected image exactly as the worker will. Both sides call the
 * same geometry package, so the count shown to the collector is the count they
 * get — this is the whole reason that package exists.
 */
function assess(width: number | null, height: number | null) {
  if (!width || !height) {
    return { grade: "REJECT" as PlateGrade, dpi: 0 };
  }
  const plate = {
    imageWidthPx: width,
    imageHeightPx: height,
    orientation: orientationFromPixels(width, height),
    page: PAGE,
    hasCaption: true,
  };
  return { grade: gradePlate(plate), dpi: Math.round(plateDpi(plate)) };
}

async function loadCollection(token: string) {
  return db.collection.findUnique({
    where: { token },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
}

/** What this collection would look like in print, before anyone commits. */
export async function assessCollection(
  token: string,
): Promise<CollectionReadiness | null> {
  const collection = await loadCollection(token);
  if (!collection) return null;

  const plates = collection.items.map((item) => {
    const { grade, dpi } = assess(item.width, item.height);
    return { id: item.id, handle: item.sourceHandle, grade, dpi };
  });

  return {
    total: plates.length,
    ok: plates.filter((p) => p.grade === "OK").length,
    marginal: plates.filter((p) => p.grade === "MARGINAL").length,
    rejected: plates.filter((p) => p.grade === "REJECT").length,
    plates,
  };
}

function getBookletQueue() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Queue("booklet-generation", { connection: { url: redisUrl } });
}

/**
 * Turn a collection into a queued booklet job — the second caller of the
 * pipeline that cycles already use.
 *
 * `keepMarginalIds` is the collector's own answer to "these will look soft,
 * keep or drop?". A plate below the floor is never printed regardless: that
 * one is not the collector's call, because they cannot see what we would be
 * putting on paper.
 */
export async function enqueueCollectionBooklet(
  token: string,
  keepMarginalIds: string[],
): Promise<{ printFileId: string; plateCount: number }> {
  const collection = await loadCollection(token);
  if (!collection) throw new Error(`Unknown collection token: ${token}`);

  const keep = new Set(keepMarginalIds);
  const plates = collection.items
    .filter((item) => {
      const { grade } = assess(item.width, item.height);
      return grade === "OK" || (grade === "MARGINAL" && keep.has(item.id));
    })
    .map((item) => ({
      id: item.id,
      title: item.caption?.split("\n")[0]?.trim() || null,
      storageKey: item.storageKey,
      mimeType: null,
      width: item.width,
      height: item.height,
      orientation: orientationFromPixels(item.width ?? 1, item.height ?? 1),
      creatorName: `@${item.sourceHandle}`,
    }));

  if (plates.length === 0) {
    throw new Error("Nothing in this collection is printable");
  }

  const printFile = await db.generatedPrintFile.upsert({
    where: { collectionId: collection.id },
    create: { collectionId: collection.id, status: "PENDING" },
    update: { status: "PENDING", errorMessage: null },
  });

  const queue = getBookletQueue();
  try {
    await queue.add(
      "generate",
      {
        printFileId: printFile.id,
        issueLabel: "Your Collection",
        plates,
      },
      { jobId: `booklet-collection-${collection.id}` },
    );
  } finally {
    await queue.close();
  }

  return { printFileId: printFile.id, plateCount: plates.length };
}
