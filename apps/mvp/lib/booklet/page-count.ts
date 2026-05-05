import type {
  CollectorReleaseSelection,
  Release,
  ReleaseArtwork,
} from "@prisma/client";

type SelectionWithRelease = CollectorReleaseSelection & {
  release: Release & {
    artworks: (ReleaseArtwork & {
      artwork: { id: string };
    })[];
  };
};

export interface PageCountResult {
  artworkPages: number;
  coverPages: number;
  totalPages: number;
}

const COVER_PAGES = 1;
const BACK_COVER_PAGES = 1;

export function computeBookletPageCount(
  selections: SelectionWithRelease[],
): PageCountResult {
  const artworkPages = selections.reduce((total, selection) => {
    if (!selection.release.artworks) {
      console.warn(
        `Missing artworks for release ${selection.release.id}, selection ${selection.id}`,
      );
      return total;
    }
    return total + selection.release.artworks.length;
  }, 0);

  const coverPages = COVER_PAGES + BACK_COVER_PAGES;
  let totalPages = artworkPages + coverPages;

  if (totalPages % 2 !== 0) {
    totalPages += 1;
  }

  return { artworkPages, coverPages, totalPages };
}
