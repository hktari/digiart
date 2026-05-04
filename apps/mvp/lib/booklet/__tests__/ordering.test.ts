import { describe, expect, it } from "vitest";
import {
  sortArtworksDeterministically,
  sortSelectionsDeterministically,
} from "@/lib/booklet/ordering";

function makeSelection(
  id: string,
  creatorCreatedAt: Date,
  releaseCreatedAt: Date,
) {
  return {
    id,
    collectorProfileId: "cp-1",
    releaseId: `rel-${id}`,
    cycleId: "cyc-1",
    createdAt: new Date(),
    release: {
      id: `rel-${id}`,
      creatorProfileId: "cr-1",
      cycleId: null,
      title: "Test",
      description: null,
      status: "PUBLISHED" as const,
      createdAt: releaseCreatedAt,
      updatedAt: new Date(),
      creatorProfile: {
        id: "cr-1",
        createdAt: creatorCreatedAt,
      },
      artworks: [],
    },
  };
}

describe("sortSelectionsDeterministically", () => {
  it("sorts by creator createdAt, then release createdAt, then id", () => {
    const early = new Date("2024-01-01");
    const mid = new Date("2024-06-01");
    const late = new Date("2024-12-01");

    const selections = [
      makeSelection("c", late, mid),
      makeSelection("a", early, late),
      makeSelection("b", early, mid),
    ];

    const sorted = sortSelectionsDeterministically(selections);
    expect(sorted.map((s) => s.id)).toEqual(["b", "a", "c"]);
  });

  it("falls back to id when timestamps are equal", () => {
    const date = new Date("2024-01-01");
    const selections = [
      makeSelection("z", date, date),
      makeSelection("a", date, date),
    ];

    const sorted = sortSelectionsDeterministically(selections);
    expect(sorted.map((s) => s.id)).toEqual(["a", "z"]);
  });

  it("returns empty array for empty input", () => {
    expect(sortSelectionsDeterministically([])).toEqual([]);
  });
});

describe("sortArtworksDeterministically", () => {
  it("sorts by sortOrder then id", () => {
    const artworks = [
      { sortOrder: 2, id: "b" },
      { sortOrder: 1, id: "z" },
      { sortOrder: 1, id: "a" },
    ];

    const sorted = sortArtworksDeterministically(artworks);
    expect(sorted.map((a) => a.id)).toEqual(["a", "z", "b"]);
  });
});
