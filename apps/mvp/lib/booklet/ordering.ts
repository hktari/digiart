import type {
  CollectorReleaseSelection,
  CreatorProfile,
  Release,
  ReleaseArtwork,
} from "@prisma/client";

type SelectionWithRelations = CollectorReleaseSelection & {
  release: Release & {
    creatorProfile: Pick<CreatorProfile, "id" | "createdAt">;
    artworks: (ReleaseArtwork & {
      artwork: { id: string };
    })[];
  };
};

export function sortSelectionsDeterministically<
  T extends SelectionWithRelations,
>(selections: T[]): T[] {
  return [...selections].sort((a, b) => {
    const creatorA = a.release.creatorProfile.createdAt.getTime();
    const creatorB = b.release.creatorProfile.createdAt.getTime();
    if (creatorA !== creatorB) return creatorA - creatorB;

    const releaseA = a.release.createdAt.getTime();
    const releaseB = b.release.createdAt.getTime();
    if (releaseA !== releaseB) return releaseA - releaseB;

    return a.id.localeCompare(b.id);
  });
}

export function sortArtworksDeterministically<
  T extends { sortOrder: number; id: string },
>(artworks: T[]): T[] {
  return [...artworks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}
