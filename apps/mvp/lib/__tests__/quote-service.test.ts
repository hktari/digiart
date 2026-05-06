import { beforeEach, describe, expect, it, vi } from "vitest";
import { getQuote } from "../peecho/quote-service";

vi.mock("@/lib/db", () => ({
  db: {
    podOffering: {
      findFirst: vi.fn(),
    },
    platformConfig: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../peecho/client", () => ({
  peechoClient: {
    getQuote: vi.fn(),
  },
}));

describe("getQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches quote with explicit offeringId", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(db.platformConfig.findFirst).mockResolvedValue({
      id: "cfg-1",
      quoteMarginAmount: 0.3,
      creatorPayoutSplit: 0.7,
      platformFeeSplit: 0.3,
      updatedAt: new Date(),
      updatedBy: null,
    });

    vi.mocked(peechoClient.getQuote).mockResolvedValue({
      quoteDetails: { countryCode: "US", currency: "USD", exchangeRate: "1" },
      quotedItems: [
        {
          offeringId: 1,
          numberOfPages: 30,
          quantity: 1,
          basePrice: 2.26,
          pricePerPage: 0.11,
          productPrice: 12.5,
          shippingWholesale: 5.0,
          totalQuantityDiscount: 0,
          vatPercentage: 0,
          vat: 1.75,
          totalItemPrice: 19.25,
        },
      ],
      quoteSummary: {
        numberOfItems: 1,
        totalWholesalePrice: 19.25,
        totalShippingPrice: 5.0,
        vatSummary: [{ vatPercentage: 0, vat: 0 }],
        totalQuantityDiscount: 0,
      },
    });

    const result = await getQuote({
      country: "US",
      pageCount: 30,
      offeringId: "peecho-ext-1",
      countryStateCode: "CA",
    });

    // markup = (12.5 + 1.75) * 0.3 = 4.275, baseAmount = 12.5 - 4.275 = 8.225
    expect(result).toEqual({
      shippingAmount: 5.0,
      productAmount: 12.5,
      baseAmount: 8.225,
      markupAmount: 4.275,
      taxAmount: 1.75,
      totalEstimate: 19.25,
      currency: "USD",
      offeringId: "peecho-ext-1",
    });

    expect(peechoClient.getQuote).toHaveBeenCalledWith({
      offering_id: "peecho-ext-1",
      page_count: 30,
      country: "US",
      country_state_code: "CA",
    });
  });

  it("throws when US quote is requested without state code", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.platformConfig.findFirst).mockResolvedValue(null);
    await expect(
      getQuote({ country: "US", pageCount: 30, offeringId: "ext-1" }),
    ).rejects.toThrow("countryStateCode is required");
  });

  it("looks up default offering when offeringId not provided", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(db.platformConfig.findFirst).mockResolvedValue(null);
    vi.mocked(db.podOffering.findFirst).mockResolvedValue({
      id: "db-offering-1",
      externalId: "peecho-ext-2",
      name: "Default",
      minPages: 20,
      maxPages: 100,
      isActive: true,
    } as never);

    vi.mocked(peechoClient.getQuote).mockResolvedValue({
      quoteDetails: {
        countryCode: "DE",
        currency: "EUR",
        exchangeRate: "0.88",
      },
      quotedItems: [
        {
          offeringId: 2,
          numberOfPages: 40,
          quantity: 1,
          basePrice: 2.0,
          pricePerPage: 0.1,
          productPrice: 10.0,
          shippingWholesale: 4.0,
          totalQuantityDiscount: 0,
          vatPercentage: 19,
          vat: 1.4,
          totalItemPrice: 15.4,
        },
      ],
      quoteSummary: {
        numberOfItems: 1,
        totalWholesalePrice: 15.4,
        totalShippingPrice: 4.0,
        vatSummary: [{ vatPercentage: 19, vat: 1.4 }],
        totalQuantityDiscount: 0,
      },
    });

    const result = await getQuote({ country: "DE", pageCount: 40 });

    expect(result.offeringId).toBe("peecho-ext-2");
    expect(db.podOffering.findFirst).toHaveBeenCalledWith({
      where: {
        isActive: true,
        minPages: { lte: 40 },
        maxPages: { gte: 40 },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  it("throws when no suitable offering found", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.platformConfig.findFirst).mockResolvedValue(null);
    vi.mocked(db.podOffering.findFirst).mockResolvedValue(null);

    await expect(getQuote({ country: "DE", pageCount: 999 })).rejects.toThrow(
      "No suitable offering found",
    );
  });

  it("throws when Peecho client fails", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(db.platformConfig.findFirst).mockResolvedValue(null);
    vi.mocked(peechoClient.getQuote).mockRejectedValue(
      new Error("Peecho API error: 500 Internal Server Error"),
    );

    await expect(
      getQuote({ country: "US", pageCount: 30, offeringId: "ext-1" }),
    ).rejects.toThrow();
  });

  it("maps all fields correctly from Peecho response", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(db.platformConfig.findFirst).mockResolvedValue({
      id: "cfg-1",
      quoteMarginAmount: 0.3,
      creatorPayoutSplit: 0.7,
      platformFeeSplit: 0.3,
      updatedAt: new Date(),
      updatedBy: null,
    });

    vi.mocked(peechoClient.getQuote).mockResolvedValue({
      quoteDetails: {
        countryCode: "GB",
        currency: "GBP",
        exchangeRate: "0.85",
      },
      quotedItems: [
        {
          offeringId: 3,
          numberOfPages: 50,
          quantity: 1,
          basePrice: 3.0,
          pricePerPage: 0.15,
          productPrice: 20.0,
          shippingWholesale: 8.5,
          totalQuantityDiscount: 0,
          vatPercentage: 20,
          vat: 2.85,
          totalItemPrice: 31.35,
        },
      ],
      quoteSummary: {
        numberOfItems: 1,
        totalWholesalePrice: 31.35,
        totalShippingPrice: 8.5,
        vatSummary: [{ vatPercentage: 20, vat: 2.85 }],
        totalQuantityDiscount: 0,
      },
    });

    const result = await getQuote({
      country: "GB",
      pageCount: 50,
      offeringId: "ext-1",
    });

    // markup = (20.0 + 2.85) * 0.3 = 6.855, baseAmount = 20.0 - 6.855 = 13.145
    expect(result.markupAmount).toBe(6.855);
    expect(result.baseAmount).toBe(13.145);
    expect(result.productAmount).toBe(20.0);
    expect(result.shippingAmount).toBe(8.5);
    expect(result.taxAmount).toBe(2.85);
    expect(result.totalEstimate).toBe(31.35);
    expect(result.currency).toBe("GBP");
  });
});
