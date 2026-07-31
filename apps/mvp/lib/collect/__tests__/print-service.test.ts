import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    collection: { findUnique: vi.fn() },
    generatedPrintFile: { upsert: vi.fn() },
  },
}));

// vi.hoisted, because vi.mock factories run before module-scope consts.
const { mockQueueAdd, mockQueueClose } = vi.hoisted(() => ({
  mockQueueAdd: vi.fn(),
  mockQueueClose: vi.fn(),
}));
vi.mock("bullmq", () => ({
  Queue: class {
    add = mockQueueAdd;
    close = mockQueueClose;
  },
}));

import { db } from "@/lib/db";
import { assessCollection, enqueueCollectionBooklet } from "../print-service";

const item = (
  id: string,
  width: number | null,
  height: number | null,
  handle = "someartist",
) => ({
  id,
  width,
  height,
  sourceHandle: handle,
  storageKey: `collect/tok/${id}.jpg`,
  caption: null,
});

function collectionWith(items: ReturnType<typeof item>[]) {
  return { id: "col-1", items } as never;
}

describe("assessCollection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sorts every collected item into a tier", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(
      collectionWith([
        item("a", 1880, 2280), // ~373dpi
        item("b", 1131, 1685), // ~232dpi
        item("c", 819, 1024), // ~163dpi
      ]),
    );

    const readiness = await assessCollection("tok");

    expect(readiness).toMatchObject({
      total: 3,
      ok: 1,
      marginal: 1,
      rejected: 1,
    });
    expect(readiness?.plates.map((p) => p.grade)).toEqual([
      "OK",
      "MARGINAL",
      "REJECT",
    ]);
  });

  it("returns null for an unknown token", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(null as never);
    expect(await assessCollection("nope")).toBeNull();
  });

  it("treats an item with no measured size as rejected", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(
      collectionWith([item("a", null, null)]),
    );

    const readiness = await assessCollection("tok");

    expect(readiness).toMatchObject({
      total: 1,
      ok: 0,
      marginal: 0,
      rejected: 1,
    });
    expect(readiness?.plates[0].dpi).toBe(0);
  });
});

describe("enqueueCollectionBooklet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.generatedPrintFile.upsert).mockResolvedValue({
      id: "pf-1",
    } as never);
  });

  it("enqueues only the printable plates, keyed by the print file row", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(
      collectionWith([
        item("ok", 1880, 2280),
        item("soft", 1131, 1685),
        item("bad", 819, 1024),
      ]),
    );

    const result = await enqueueCollectionBooklet("tok", []);

    expect(result).toEqual({ printFileId: "pf-1", plateCount: 1 });
    const [, payload] = mockQueueAdd.mock.calls[0];
    expect(payload.printFileId).toBe("pf-1");
    expect(payload.plates.map((p: { id: string }) => p.id)).toEqual(["ok"]);
  });

  it("includes a marginal plate when the collector chose to keep it", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(
      collectionWith([item("ok", 1880, 2280), item("soft", 1131, 1685)]),
    );

    await enqueueCollectionBooklet("tok", ["soft"]);

    const [, payload] = mockQueueAdd.mock.calls[0];
    expect(payload.plates.map((p: { id: string }) => p.id)).toEqual([
      "ok",
      "soft",
    ]);
  });

  it("never enqueues a plate the collector was never offered", async () => {
    // "bad" is below the floor; keeping it is not the collector's to choose.
    vi.mocked(db.collection.findUnique).mockResolvedValue(
      collectionWith([item("ok", 1880, 2280), item("bad", 819, 1024)]),
    );

    await enqueueCollectionBooklet("tok", ["bad"]);

    const [, payload] = mockQueueAdd.mock.calls[0];
    expect(payload.plates.map((p: { id: string }) => p.id)).toEqual(["ok"]);
  });

  it("credits each plate to the artist who posted it", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(
      collectionWith([item("ok", 1880, 2280, "magda")]),
    );

    await enqueueCollectionBooklet("tok", []);

    const [, payload] = mockQueueAdd.mock.calls[0];
    expect(payload.plates[0].creatorName).toBe("@magda");
  });

  // These two catch by hand rather than using `.rejects.toThrow()`, which is
  // broken repo-wide: `@testing-library/jest-dom/vitest` in vitest.setup.ts
  // breaks the async rejects chain under Vitest 4, and it is already failing
  // several suites on main. Asserting this way keeps the coverage without
  // depending on that being fixed first.
  it("refuses when nothing in the collection is printable", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(
      collectionWith([item("bad", 819, 1024)]),
    );

    const error = await enqueueCollectionBooklet("tok", []).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/nothing in this collection is printable/i);
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("throws on an unknown token", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(null as never);

    const error = await enqueueCollectionBooklet("nope", []).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/unknown collection token/i);
  });
});
