import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    subscriptionCycle: {
      findUnique: vi.fn(),
    },
    checkoutIntent: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    collectorReleaseSelection: {
      findMany: vi.fn(),
    },
    pricingQuoteSnapshot: {
      create: vi.fn(),
      update: vi.fn(),
    },
    generatedPrintFile: {
      findUnique: vi.fn(),
    },
    collectorProfile: {
      findUnique: vi.fn(),
    },
    podOffering: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/peecho/quote-service", () => ({
  getQuote: vi.fn(),
}));

vi.mock("@/lib/peecho/client", () => ({
  peechoClient: {
    createOrder: vi.fn(),
    getOrderDetails: vi.fn(),
  },
}));

vi.mock("@/lib/s3", () => ({
  extractKeyFromStorageUrl: vi.fn(),
  getPresignedGetUrl: vi.fn(),
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
  let peechoClient: Awaited<
    typeof import("@/lib/peecho/client")
  >["peechoClient"];
  let extractKeyFromStorageUrl: ReturnType<typeof vi.fn>;
  let getPresignedGetUrl: ReturnType<typeof vi.fn>;

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
    peechoClient = (await import("@/lib/peecho/client")).peechoClient;
    const s3 = await import("@/lib/s3");
    extractKeyFromStorageUrl = s3.extractKeyFromStorageUrl;
    getPresignedGetUrl = s3.getPresignedGetUrl;
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
        id: "intent-1",
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

    // Mock print file not ready (no order creation path)
    vi.mocked(db.generatedPrintFile.findUnique).mockResolvedValue(null);

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

  it("creates Peecho order when print file is ready", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cycle-1",
    } as any);
    vi.mocked(db.checkoutIntent.findMany).mockResolvedValue([
      {
        id: "intent-1",
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

    // Mock print file ready
    vi.mocked(db.generatedPrintFile.findUnique).mockResolvedValue({
      id: "pf-1",
      storageUrl: "https://s3/bucket/key.pdf",
      status: "READY",
      pageCount: 24,
    } as any);
    vi.mocked(extractKeyFromStorageUrl).mockReturnValue("bucket/key.pdf");
    vi.mocked(getPresignedGetUrl).mockResolvedValue("https://presigned-url");
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      displayName: "Test User",
      shippingAddressLine1: "123 Main St",
      shippingCity: "Berlin",
      shippingZip: "10115",
      shippingCountry: "DE",
      user: { email: "test@example.com", name: "Test User" },
    } as any);
    vi.mocked(db.podOffering.findFirst).mockResolvedValue({
      id: "offering-1",
      externalId: "123",
    } as any);
    vi.mocked(peechoClient.createOrder).mockResolvedValue({
      order_id: 456,
    });
    vi.mocked(peechoClient.getOrderDetails).mockResolvedValue({
      order_id: 456,
      total_wholesale_price_inc_taxes: 12.0,
      total_retail_price_inc_taxes: 15.0,
      currency: "EUR",
    } as any);
    vi.mocked(db.checkoutIntent.update).mockResolvedValue({
      id: "intent-1",
    } as any);

    const result = await freezeCollectorCycleQuotes("cycle-1");

    expect(result.frozen).toBe(1);
    expect(peechoClient.createOrder).toHaveBeenCalled();
    expect(peechoClient.getOrderDetails).toHaveBeenCalledWith(456);
    expect(db.checkoutIntent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          peechoOrderId: "456",
          wholesaleTotalAmount: 12.0,
          retailTotalAmount: 15.0,
          platformMarkupAmount: 3.0,
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
