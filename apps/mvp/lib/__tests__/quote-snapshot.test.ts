import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteSnapshot, getLatestQuote } from "../pricing/quote-snapshot";

vi.mock("@/lib/db", () => ({
  db: {
    podOffering: {
      findFirst: vi.fn(),
    },
    collectorProfile: {
      findUnique: vi.fn(),
    },
    pricingQuoteSnapshot: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockQuoteData = {
  shippingAmount: 5.0,
  productAmount: 12.5,
  taxAmount: 1.75,
  totalEstimate: 19.25,
  currency: "USD",
  offeringId: "peecho-ext-1",
};

describe("createQuoteSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates snapshot successfully", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.podOffering.findFirst).mockResolvedValue({
      id: "db-offering-1",
      externalId: "peecho-ext-1",
    } as never);

    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      shippingCountry: "US",
    } as never);

    const mockSnapshot = {
      id: "snapshot-1",
      collectorProfileId: "collector-1",
      cycleId: "cycle-1",
      offeringId: "db-offering-1",
      country: "US",
      requestedPageCount: 30,
      ...mockQuoteData,
      quotedAt: new Date(),
    };

    vi.mocked(db.pricingQuoteSnapshot.create).mockResolvedValue(
      mockSnapshot as never,
    );

    const result = await createQuoteSnapshot(
      "collector-1",
      "cycle-1",
      30,
      mockQuoteData,
    );

    expect(result).toEqual(mockSnapshot);
    expect(db.pricingQuoteSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        collectorProfileId: "collector-1",
        cycleId: "cycle-1",
        offeringId: "db-offering-1",
        country: "US",
        requestedPageCount: 30,
        shippingAmount: 5.0,
        productAmount: 12.5,
        taxAmount: 1.75,
        totalEstimate: 19.25,
        currency: "USD",
      }),
    });
  });

  it("throws when offering not found", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.podOffering.findFirst).mockResolvedValue(null);

    await expect(
      createQuoteSnapshot("collector-1", "cycle-1", 30, mockQuoteData),
    ).rejects.toThrow("Offering not found");
  });

  it("throws when collector profile not found", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.podOffering.findFirst).mockResolvedValue({
      id: "db-offering-1",
    } as never);
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue(null);

    await expect(
      createQuoteSnapshot("collector-1", "cycle-1", 30, mockQuoteData),
    ).rejects.toThrow("Collector shipping country not set");
  });

  it("throws when collector has no shipping country", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.podOffering.findFirst).mockResolvedValue({
      id: "db-offering-1",
    } as never);
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      shippingCountry: null,
    } as never);

    await expect(
      createQuoteSnapshot("collector-1", "cycle-1", 30, mockQuoteData),
    ).rejects.toThrow("Collector shipping country not set");
  });
});

describe("getLatestQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns latest quote for collector and cycle", async () => {
    const { db } = await import("@/lib/db");

    const mockQuote = {
      id: "quote-1",
      collectorProfileId: "collector-1",
      cycleId: "cycle-1",
      totalEstimate: 19.25,
      currency: "USD",
      quotedAt: new Date(),
      offering: { id: "db-offering-1", name: "Softcover" },
    };

    vi.mocked(db.pricingQuoteSnapshot.findFirst).mockResolvedValue(
      mockQuote as never,
    );

    const result = await getLatestQuote("collector-1", "cycle-1");

    expect(result).toEqual(mockQuote);
    expect(db.pricingQuoteSnapshot.findFirst).toHaveBeenCalledWith({
      where: { collectorProfileId: "collector-1", cycleId: "cycle-1" },
      orderBy: { quotedAt: "desc" },
      include: { offering: true },
    });
  });

  it("returns null when no quote exists", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.pricingQuoteSnapshot.findFirst).mockResolvedValue(null);

    const result = await getLatestQuote("collector-1", "cycle-1");

    expect(result).toBeNull();
  });
});
