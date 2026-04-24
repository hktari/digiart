import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import type { createTestCreator } from "./user.factory";

type CreatorFactoryResult = Awaited<ReturnType<typeof createTestCreator>>;

export interface CreateArtworkOptions {
  creatorProfileId: string;
  title?: string;
  storageKey?: string;
  mimeType?: "image/jpeg" | "image/png";
  fileSize?: number;
  width?: number;
  height?: number;
  orientation?: "PORTRAIT" | "LANDSCAPE" | "SQUARE";
}

export async function createTestArtwork(
  db: PrismaClient,
  options: CreateArtworkOptions,
) {
  const width = options.width ?? faker.number.int({ min: 1200, max: 4000 });
  const height = options.height ?? faker.number.int({ min: 1200, max: 4000 });
  const orientation =
    options.orientation ??
    (width > height ? "LANDSCAPE" : width < height ? "PORTRAIT" : "SQUARE");

  return db.artwork.create({
    data: {
      creatorProfileId: options.creatorProfileId,
      title: options.title ?? faker.lorem.sentence({ min: 1, max: 5 }),
      storageKey:
        options.storageKey ??
        `artworks/${faker.string.uuid()}.${options.mimeType === "image/png" ? "png" : "jpg"}`,
      mimeType: options.mimeType ?? "image/jpeg",
      fileSize:
        options.fileSize ?? faker.number.int({ min: 100_000, max: 10_000_000 }),
      width,
      height,
      orientation,
      status: "ACTIVE",
    },
  });
}

export async function createTestArtworks(
  db: PrismaClient,
  creator: CreatorFactoryResult,
  count: number,
  options: Partial<Omit<CreateArtworkOptions, "creatorProfileId">> = {},
) {
  const artworks: Awaited<ReturnType<typeof createTestArtwork>>[] = [];
  for (let i = 0; i < count; i++) {
    artworks.push(
      await createTestArtwork(db, {
        creatorProfileId: creator.profile.id,
        title: options.title ?? `${faker.lorem.sentence()} ${i + 1}`,
        ...options,
      }),
    );
  }
  return artworks;
}
