import { describe, it, expect, beforeEach, vi } from "vitest";
import { getQuote } from "../peecho/quote-service";

vi.mock("@/lib/db", () => ({
  db: {
    podOffering: {
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
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(peechoClient.getQuote).mockResolvedValue({
      product_amount: 12.5,
      shipping_amount: 5.0,
      tax_amount: 1.75,
      total_amount: 19.25,
      currency: "USD",
    });

    const result = await getQuote({
      country: "US",
      pageCount: 30,
      offeringId: "peecho-ext-1",
    });

    expect(result).toEqual({
      shippingAmount: 5.0,
      productAmount: 12.5,
      taxAmount: 1.75,
      totalEstimate: 19.25,
      currency: "USD",
      offeringId: "peecho-ext-1",
    });

    expect(peechoClient.getQuote).toHaveBeenCalledWith({
      offering_id: "peecho-ext-1",
      page_count: 30,
      country: "US",
    });
  });

  it("looks up default offering when offeringId not provided", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(db.podOffering.findFirst).mockResolvedValue({
      id: "db-offering-1",
      externalId: "peecho-ext-2",
      name: "Default",
      minPages: 20,
      maxPages: 100,
      isActive: true,
    } as never);

    vi.mocked(peechoClient.getQuote).mockResolvedValue({
      product_amount: 10.0,
      shipping_amount: 4.0,
      tax_amount: 1.4,
      total_amount: 15.4,
      currency: "EUR",
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

    vi.mocked(db.podOffering.findFirst).mockResolvedValue(null);

    await expect(getQuote({ country: "US", pageCount: 999 })).rejects.toThrow(
      "No suitable offering found"
    );
  });

  it("throws when Peecho client fails", async () => {
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(peechoClient.getQuote).mockRejectedValue(
      new Error("Peecho API error: 500 Internal Server Error")
    );

    await expect(
      getQuote({ country: "US", pageCount: 30, offeringId: "ext-1" })
    ).rejects.toThrow();
  });

  it("maps all fields correctly from Peecho response", async () => {
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(peechoClient.getQuote).mockResolvedValue({
      product_amount: 20.0,
      shipping_amount: 8.5,
      tax_amount: 2.85,
      total_amount: 31.35,
      currency: "GBP",
    });

    const result = await getQuote({ country: "GB", pageCount: 50, offeringId: "ext-1" });

    expect(result.productAmount).toBe(20.0);
    expect(result.shippingAmount).toBe(8.5);
    expect(result.taxAmount).toBe(2.85);
    expect(result.totalEstimate).toBe(31.35);
    expect(result.currency).toBe("GBP");
  });
});
