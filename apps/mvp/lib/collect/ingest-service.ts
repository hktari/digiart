import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPresignedStorageUrl, putStorageObject } from "@/lib/s3";

const SOURCE = "threads_collect";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type IngestImage = {
  url: string;
  imageId: string;
  width?: number | null;
  height?: number | null;
  ext?: string | null;
};

export type IngestPayload = {
  token: string;
  handle: string;
  postUrl?: string | null;
  caption?: string | null;
  images: IngestImage[];
};

export type IngestResult = {
  token: string;
  collectionUrl: string;
  itemCount: number;
};

/** Reads a safe image extension from a URL, defaulting to jpg. */
export function extFromUrl(url: string): string {
  const match = url.split("?")[0].match(/\.([a-z0-9]{3,4})$/i);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext in CONTENT_TYPE_BY_EXT ? ext : "jpg";
}

// Fetches the (still-valid) signed CDN image and persists it durably so the
// hosted collection doesn't rot when the signature expires.
async function storeImage(
  token: string,
  image: IngestImage,
): Promise<string | null> {
  try {
    const res = await fetch(image.url);
    if (!res.ok) {
      logger.error("[collect] image fetch failed", {
        status: res.status,
        imageId: image.imageId,
      });
      return null;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    const ext = (image.ext ?? extFromUrl(image.url)).toLowerCase();
    const key = `collect/${token}/${image.imageId}.${ext}`;
    await putStorageObject(
      key,
      bytes,
      CONTENT_TYPE_BY_EXT[ext] ?? "image/jpeg",
    );
    return key;
  } catch (error) {
    logger.error("[collect] storeImage failed", {
      imageId: image.imageId,
      error,
    });
    return null;
  }
}

/**
 * Records a collect: upserts the collection, ensures the two prospects
 * (collector + creator Leads), persists the images, and links them to the
 * creator lead. Value-first — collector identity stays anonymous until a later
 * value moment enriches the lead's email.
 */
export async function ingestCollect(
  payload: IngestPayload,
): Promise<IngestResult> {
  const handle = payload.handle.replace(/^@/, "").toLowerCase();

  // 1. Collection (guest token).
  const collection = await db.collection.upsert({
    where: { token: payload.token },
    create: { token: payload.token },
    update: {},
  });

  // 2. Prospect #1 — the collector. Anonymous lead, created once per collection.
  let collectorLeadId = collection.collectorLeadId;
  if (!collectorLeadId) {
    const lead = await db.lead.create({
      data: { type: "COLLECTOR", status: "NEW", source: SOURCE },
    });
    collectorLeadId = lead.id;
    await db.collection.update({
      where: { id: collection.id },
      data: { collectorLeadId },
    });
  }
  await db.leadEvent.create({
    data: {
      leadId: collectorLeadId,
      eventName: "collect",
      metadata: { handle, itemCount: payload.images.length },
    },
  });

  // 3. Prospect #2 — the creator. Deduped by Threads handle across all collects.
  let creatorLead = await db.lead.findFirst({
    where: { type: "CREATOR", sourceHandle: handle },
  });
  if (!creatorLead) {
    creatorLead = await db.lead.create({
      data: {
        type: "CREATOR",
        status: "NEW",
        source: SOURCE,
        sourceHandle: handle,
        notes: `@${handle} (Threads)`,
      },
    });
  }

  // 4. Persist images. Re-collecting the same piece dedupes on [collection, imageId].
  let itemCount = 0;
  for (const image of payload.images) {
    const key = await storeImage(payload.token, image);
    if (!key) continue;
    await db.collectedItem.upsert({
      where: {
        collectionId_imageId: {
          collectionId: collection.id,
          imageId: image.imageId,
        },
      },
      create: {
        collectionId: collection.id,
        storageKey: key,
        imageId: image.imageId,
        width: image.width ?? null,
        height: image.height ?? null,
        sourceHandle: handle,
        sourcePostUrl: payload.postUrl ?? null,
        caption: payload.caption ?? null,
        creatorLeadId: creatorLead.id,
      },
      update: { storageKey: key, creatorLeadId: creatorLead.id },
    });
    itemCount++;
  }

  return {
    token: payload.token,
    collectionUrl: `/c/${payload.token}`,
    itemCount,
  };
}

export type CollectionView = {
  token: string;
  ownerUserId: string | null;
  itemCount: number;
  artistCount: number;
  groups: {
    handle: string;
    items: {
      id: string;
      url: string;
      caption: string | null;
      postUrl: string | null;
    }[];
  }[];
};

/** Loads a collection for display, resolving durable storage keys to URLs. */
export async function getCollectionView(
  token: string,
): Promise<CollectionView | null> {
  const collection = await db.collection.findUnique({
    where: { token },
    // Newest first. Grouping below preserves first-seen order, so artists come
    // out ordered by their most recent collect, items within each newest-first.
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  if (!collection) return null;

  const byHandle = new Map<string, CollectionView["groups"][number]["items"]>();
  for (const item of collection.items) {
    const url = await getPresignedStorageUrl(item.storageKey);
    const list = byHandle.get(item.sourceHandle) ?? [];
    list.push({
      id: item.id,
      url,
      caption: item.caption,
      postUrl: item.sourcePostUrl,
    });
    byHandle.set(item.sourceHandle, list);
  }

  const groups = [...byHandle.entries()].map(([handle, items]) => ({
    handle,
    items,
  }));

  return {
    token: collection.token,
    ownerUserId: collection.ownerUserId,
    itemCount: collection.items.length,
    artistCount: groups.length,
    groups,
  };
}

export type ClaimView = {
  handle: string;
  itemCount: number;
  collectorCount: number;
  items: { id: string; url: string; postUrl: string | null }[];
};

/** Aggregates everything collected for one Threads handle (the claim page). */
export async function getClaimView(handle: string): Promise<ClaimView | null> {
  const normalized = handle.replace(/^@/, "").toLowerCase();
  const items = await db.collectedItem.findMany({
    where: { sourceHandle: normalized },
    orderBy: { createdAt: "desc" },
  });
  if (items.length === 0) return null;

  const resolved = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      url: await getPresignedStorageUrl(item.storageKey),
      postUrl: item.sourcePostUrl,
    })),
  );

  const collectorCount = new Set(items.map((i) => i.collectionId)).size;

  return {
    handle: normalized,
    itemCount: items.length,
    collectorCount,
    items: resolved,
  };
}
