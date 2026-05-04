import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    subscriptionCycle: {
      findUnique: vi.fn(),
    },
    checkoutIntent: {
      findMany: vi.fn(),
    },
    collectorReleaseSelection: {
      findMany: vi.fn(),
    },
    pricingQuoteSnapshot: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/peecho/quote-service", () => ({
  getQuote: vi.fn(),
}));

vi.mock("@/lib/pricing/quote-snapshot", () => ({
  createQuoteSnapshot: vi.fn(),
}));

vi.mock("@/lib/booklet/page-count", () => ({
  computeBookletPageCount: vi.fn(),
}));

describe("freezeCollectorCycleQuotes", () => {
  let freezeCollectorCycleQuotes: typeof import("../freeze-service").freezeCollectorCycleQuotes;
  let db: Awaited<typeof import("@/lib/db")>["db"];
  let getQuote: ReturnType<typeof vi.fn>;
  let createQuoteSnapshot: ReturnType<typeof vi.fn>;
  let computeBookletPageCount: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../freeze-service");
    freezeCollectorCycleQuotes = mod.freezeCollectorCycleQuotes;
    db = (await import("@/lib/db")).db;
    getQuote = (await import("@/lib/peecho/quote-service")).getQuote;
    createQuoteSnapshot = (await import("@/lib/pricing/quote-snapshot"))
      .createQuoteSnapshot;
    computeBookletPageCount = (await import("@/lib/booklet/page-count"))
      .computeBookletPageCount;
  });

  it("returns error when cycle not found", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);

    const result = await freezeCollectorCycleQuotes("cycle-1");

    expect(result.frozen).toBe(0);
    expect(result.errors).toContain("Cycle cycle-1 not found");
  });

  it("marks collector as ineligible when no shipping country", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cycle-1",
    } as any);
    vi.mocked(db.checkoutIntent.findMany).mockResolvedValue([
      {
        collectorProfileId: "collector-1",
        collectorProfile: {
          id: "collector-1",
          shippingCountry: null,
          shippingStateCode: null,
        },
      },
    ] as any);

    const result = await freezeCollectorCycleQuotes("cycle-1");

    expect(result.ineligible).toBe(1);
    expect(result.frozen).toBe(0);
  });

  it("marks collector as ineligible when no selections", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cycle-1",
    } as any);
    vi.mocked(db.checkoutIntent.findMany).mockResolvedValue([
      {
        collectorProfileId: "collector-1",
        collectorProfile: {
          id: "collector-1",
          shippingCountry: "US",
          shippingStateCode: "CA",
        },
      },
    ] as any);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([]);

    const result = await freezeCollectorCycleQuotes("cycle-1");

    expect(result.ineligible).toBe(1);
    expect(result.frozen).toBe(0);
  });

  it("successfully freezes quote for eligible collector", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cycle-1",
    } as any);
    vi.mocked(db.checkoutIntent.findMany).mockResolvedValue([
      {
        collectorProfileId: "collector-1",
        collectorProfile: {
          id: "collector-1",
          shippingCountry: "DE",
          shippingStateCode: null,
        },
      },
    ] as any);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      {
        release: {
          artworks: [{ artwork: { id: "art-1" } }],
        },
      },
    ] as any);
    computeBookletPageCount.mockReturnValue({ totalPages: 24 });
    getQuote.mockResolvedValue({
      shippingAmount: 4.0,
      productAmount: 10.0,
      baseAmount: 5.0,
      markupAmount: 5.0,
      taxAmount: 1.4,
      totalEstimate: 15.4,
      currency: "EUR",
      offeringId: "ext-1",
    });
    createQuoteSnapshot.mockResolvedValue({
      id: "snapshot-1",
      isFrozen: false,
    });
    vi.mocked(db.pricingQuoteSnapshot.update).mockResolvedValue({
      id: "snapshot-1",
      isFrozen: true,
    } as any);

    const result = await freezeCollectorCycleQuotes("cycle-1");

    expect(result.frozen).toBe(1);
    expect(result.ineligible).toBe(0);
    expect(db.pricingQuoteSnapshot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isFrozen: true,
        }),
      }),
    );
  });

  it("catches quote fetch errors per collector", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cycle-1",
    } as any);
    vi.mocked(db.checkoutIntent.findMany).mockResolvedValue([
      {
        collectorProfileId: "collector-1",
        collectorProfile: {
          id: "collector-1",
          shippingCountry: "US",
          shippingStateCode: "CA",
        },
      },
    ] as any);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      {
        release: {
          artworks: [{ artwork: { id: "art-1" } }],
        },
      },
    ] as any);
    computeBookletPageCount.mockReturnValue({ totalPages: 24 });
    getQuote.mockRejectedValue(new Error("Peecho API error"));

    const result = await freezeCollectorCycleQuotes("cycle-1");

    expect(result.frozen).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain(
      "Collector collector-1: Peecho API error",
    );
  });
});
