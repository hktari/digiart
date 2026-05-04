import { describe, expect, it } from "vitest";
import { computeBookletPageCount } from "@/lib/booklet/page-count";

function makeSelection(artworkCount: number) {
  return {
    id: "sel-1",
    collectorProfileId: "cp-1",
    releaseId: "rel-1",
    cycleId: "cyc-1",
    createdAt: new Date(),
    release: {
      id: "rel-1",
      creatorProfileId: "cr-1",
      cycleId: null,
      title: "Test Release",
      description: null,
      status: "PUBLISHED" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      artworks: Array.from({ length: artworkCount }, (_, i) => ({
        id: `ra-${i}`,
        releaseId: "rel-1",
        artworkId: `art-${i}`,
        sortOrder: i,
        artwork: { id: `art-${i}` },
      })),
    },
  };
}

describe("computeBookletPageCount", () => {
  it("returns 0 artwork pages and 2 cover pages for empty selections", () => {
    const result = computeBookletPageCount([]);
    expect(result.artworkPages).toBe(0);
    expect(result.coverPages).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it("pads to even page count", () => {
    const result = computeBookletPageCount([makeSelection(1)]);
    expect(result.artworkPages).toBe(1);
    expect(result.coverPages).toBe(2);
    expect(result.totalPages).toBe(4);
  });

  it("does not pad when already even", () => {
    const result = computeBookletPageCount([makeSelection(2)]);
    expect(result.artworkPages).toBe(2);
    expect(result.coverPages).toBe(2);
    expect(result.totalPages).toBe(4);
  });

  it("sums across multiple releases", () => {
    const result = computeBookletPageCount([
      makeSelection(3),
      makeSelection(5),
    ]);
    expect(result.artworkPages).toBe(8);
    expect(result.coverPages).toBe(2);
    expect(result.totalPages).toBe(10);
  });

  it("handles large booklets", () => {
    const result = computeBookletPageCount([makeSelection(499)]);
    expect(result.artworkPages).toBe(499);
    expect(result.coverPages).toBe(2);
    expect(result.totalPages).toBe(502);
  });
});
