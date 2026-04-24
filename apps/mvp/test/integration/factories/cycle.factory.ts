import { faker } from "@faker-js/faker";
import type { CycleStatus, PrismaClient } from "@prisma/client";

export interface CreateCycleOptions {
  label?: string;
  month?: number;
  year?: number;
  status?: CycleStatus;
  selectionOpenDate?: Date;
  lockDate?: Date;
  fulfillmentDate?: Date;
}

export async function createTestCycle(
  db: PrismaClient,
  options: CreateCycleOptions = {},
) {
  const now = new Date();
  const year = options.year ?? now.getFullYear();
  const month = options.month ?? now.getMonth() + 1;

  const selectionOpenDate =
    options.selectionOpenDate ?? new Date(year, month - 1, 1); // First day of month

  const lockDate = options.lockDate ?? new Date(year, month - 1, 20); // 20th of month

  const fulfillmentDate =
    options.fulfillmentDate ?? new Date(year, month - 1, 25); // 25th of month

  return db.subscriptionCycle.create({
    data: {
      label: options.label ?? `${faker.date.month()} ${year}`,
      month,
      year,
      selectionOpenDate,
      lockDate,
      fulfillmentDate,
      status: options.status ?? "OPEN",
    },
  });
}

export async function createTestRelease(
  db: PrismaClient,
  options: {
    creatorProfileId: string;
    cycleId?: string;
    title?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  },
) {
  return db.release.create({
    data: {
      creatorProfileId: options.creatorProfileId,
      cycleId: options.cycleId,
      title: options.title ?? faker.lorem.sentence({ min: 2, max: 6 }),
      status: options.status ?? "PUBLISHED",
    },
  });
}

export async function addArtworkToRelease(
  db: PrismaClient,
  releaseId: string,
  artworkId: string,
  sortOrder: number = 0,
) {
  return db.releaseArtwork.create({
    data: {
      releaseId,
      artworkId,
      sortOrder,
    },
  });
}

export async function createCollectorSelection(
  db: PrismaClient,
  options: {
    collectorProfileId: string;
    releaseId: string;
    cycleId: string;
  },
) {
  return db.collectorReleaseSelection.create({
    data: {
      collectorProfileId: options.collectorProfileId,
      releaseId: options.releaseId,
      cycleId: options.cycleId,
    },
  });
}

export async function createTestBookletScenario(
  db: PrismaClient,
  options: {
    creatorCount?: number;
    artworksPerCreator?: number;
  } = {},
) {
  const { creatorCount = 2, artworksPerCreator = 2 } = options;

  // Create a cycle
  const cycle = await createTestCycle(db);

  // Import here to avoid circular dependencies
  const { createTestCreator } = await import("./user.factory");
  const { createTestCollector } = await import("./user.factory");
  const { createTestArtwork } = await import("./artwork.factory");

  // Create a collector
  const { profile: collectorProfile } = await createTestCollector(db);

  const creators: Awaited<ReturnType<typeof createTestCreator>>["profile"][] =
    [];
  const releases: Awaited<ReturnType<typeof createTestRelease>>[] = [];
  const allArtworks: Awaited<ReturnType<typeof createTestArtwork>>[] = [];

  // Create creators with releases and artworks
  for (let c = 0; c < creatorCount; c++) {
    const { profile: creatorProfile } = await createTestCreator(db);
    creators.push(creatorProfile);

    // Create a release for this cycle
    const release = await createTestRelease(db, {
      creatorProfileId: creatorProfile.id,
      cycleId: cycle.id,
    });
    releases.push(release);

    // Create artworks and add to release
    for (let a = 0; a < artworksPerCreator; a++) {
      const artwork = await createTestArtwork(db, {
        creatorProfileId: creatorProfile.id,
        title: `Artwork ${c + 1}-${a + 1}`,
        width: 1800,
        height: 2600,
        orientation: "PORTRAIT",
      });
      allArtworks.push(artwork);

      await addArtworkToRelease(db, release.id, artwork.id, a);
    }

    // Create collector selection for this release
    await createCollectorSelection(db, {
      collectorProfileId: collectorProfile.id,
      releaseId: release.id,
      cycleId: cycle.id,
    });
  }

  return {
    cycle,
    collectorProfile,
    creators,
    releases,
    artworks: allArtworks,
  };
}
