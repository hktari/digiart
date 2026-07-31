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

/**
 * Plates per artist. Without a cap the book skews hard to whoever posts most:
 * in the one real 108-piece collection a single handle supplies 11 of the 87
 * printable plates and the top three supply 30% of the book. A cap of 2 keeps
 * all 25 artists present, holds the page count near 41, and roughly halves the
 * price. 0 means uncapped.
 */
export const DEFAULT_PER_ARTIST = 2;

export interface CollectionPlate {
  id: string;
  handle: string;
  grade: PlateGrade;
  dpi: number;
  /** False when printable but held back by the per-artist cap. */
  included: boolean;
}

export interface CollectionReadiness {
  total: number;
  ok: number;
  marginal: number;
  rejected: number;
  /** Plates that will actually be bound, after grading and the cap. */
  printing: number;
  /** Printable, but held back by the per-artist cap. */
  heldBack: number;
  perArtist: number;
  artists: number;
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

type Item = {
  id: string;
  width: number | null;
  height: number | null;
  sourceHandle: string;
};

/**
 * Decide which collected items make the book: grade them, honour the
 * collector's keep/drop on the soft ones, then cap per artist.
 *
 * Both the preview and the enqueue call this, for the same reason the geometry
 * lives in one package — a preview that disagrees with the job is worse than
 * no preview.
 *
 * Within an artist the sharpest plates win; across the book the collection's
 * own order is preserved, so it still reads as theirs rather than as an
 * alphabetical index.
 */
function selectPlates(
  items: Item[],
  keepMarginalIds: Set<string>,
  perArtist: number,
): {
  included: Set<string>;
  eligibleCount: number;
  graded: Map<string, { grade: PlateGrade; dpi: number }>;
} {
  const graded = new Map(
    items.map((item) => [item.id, assess(item.width, item.height)] as const),
  );

  const eligible = items.filter((item) => {
    const grade = graded.get(item.id)?.grade;
    return (
      grade === "OK" || (grade === "MARGINAL" && keepMarginalIds.has(item.id))
    );
  });

  if (perArtist <= 0) {
    return {
      included: new Set(eligible.map((i) => i.id)),
      eligibleCount: eligible.length,
      graded,
    };
  }

  const byHandle = new Map<string, Item[]>();
  for (const item of eligible) {
    const bucket = byHandle.get(item.sourceHandle) ?? [];
    bucket.push(item);
    byHandle.set(item.sourceHandle, bucket);
  }

  const included = new Set<string>();
  for (const bucket of byHandle.values()) {
    for (const item of [...bucket]
      .sort(
        (a, b) => (graded.get(b.id)?.dpi ?? 0) - (graded.get(a.id)?.dpi ?? 0),
      )
      .slice(0, perArtist)) {
      included.add(item.id);
    }
  }

  return { included, eligibleCount: eligible.length, graded };
}

/** What this collection would look like in print, before anyone commits. */
export async function assessCollection(
  token: string,
  {
    keepMarginalIds = [],
    perArtist = DEFAULT_PER_ARTIST,
  }: { keepMarginalIds?: string[]; perArtist?: number } = {},
): Promise<CollectionReadiness | null> {
  const collection = await loadCollection(token);
  if (!collection) return null;

  const { included, eligibleCount, graded } = selectPlates(
    collection.items,
    new Set(keepMarginalIds),
    perArtist,
  );

  const plates: CollectionPlate[] = collection.items.map((item) => {
    const { grade, dpi } = graded.get(item.id) ?? { grade: "REJECT", dpi: 0 };
    return {
      id: item.id,
      handle: item.sourceHandle,
      grade,
      dpi,
      included: included.has(item.id),
    };
  });

  return {
    total: plates.length,
    ok: plates.filter((p) => p.grade === "OK").length,
    marginal: plates.filter((p) => p.grade === "MARGINAL").length,
    rejected: plates.filter((p) => p.grade === "REJECT").length,
    printing: included.size,
    // Held back by the cap only — a soft plate the collector dropped is not
    // "held back", it is declined.
    heldBack: eligibleCount - included.size,
    perArtist,
    artists: new Set(plates.filter((p) => p.included).map((p) => p.handle))
      .size,
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
  perArtist: number = DEFAULT_PER_ARTIST,
): Promise<{ printFileId: string; plateCount: number }> {
  const collection = await loadCollection(token);
  if (!collection) throw new Error(`Unknown collection token: ${token}`);

  const { included } = selectPlates(
    collection.items,
    new Set(keepMarginalIds),
    perArtist,
  );

  const plates = collection.items
    .filter((item) => included.has(item.id))
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
