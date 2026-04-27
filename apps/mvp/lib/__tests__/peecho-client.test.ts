import { beforeEach, describe, expect, it, vi } from "vitest";
import { PeechoClient } from "../peecho/client";

// Mock fetch globally
global.fetch = vi.fn();

describe("PeechoClient", () => {
  let client: PeechoClient;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PEECHO_MERCHANT_API_KEY = "test-merchant-key";
    process.env.PEECHO_API_URL = "https://test.www.peecho.com/rest/v2";
    client = new PeechoClient();
  });

  describe("getOfferings", () => {
    it("fetches offerings and returns the flattened offerings array", async () => {
      const mockOffering = {
        id: 191596,
        name: "Softcover Booklet",
        catalogueItemCode: "PA-hcl-S-l",
        minimumQuantity: 1,
        minNumberOfPages: 20,
        maxNumberOfPages: 100,
        dimensionWidth: 210,
        dimensionHeight: 297,
        dynamicSize: false,
        pagesIncludedInBasePrice: 0,
      };
      const mockApiResponse = { BOOKS: { HARDCOVER: [mockOffering] } };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
        text: () => Promise.resolve(""),
      } as Response);

      const result = await client.getOfferings();

      expect(result).toEqual([mockOffering]);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/offering/list"),
        expect.any(Object),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("merchantApiKey=test-merchant-key"),
        expect.any(Object),
      );
    });

    it("returns empty array when response is empty object", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      } as Response);

      const result = await client.getOfferings();
      expect(result).toEqual([]);
    });

    it("throws error when API call fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Server Error"),
      } as Response);

      await expect(client.getOfferings()).rejects.toThrow("Peecho API error");
    });
  });

  describe("getQuote", () => {
    const mockQuote: import("../peecho/client").PeechoQuoteResponse = {
      quoteDetails: { countryCode: "US", currency: "USD", exchangeRate: "1" },
      quotedItems: [
        {
          offeringId: 12345,
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
    };

    it("fetches quote via POST /quote with JSON body", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuote),
        text: () => Promise.resolve(""),
      } as Response);

      const result = await client.getQuote({
        offering_id: "12345",
        page_count: 30,
        country: "US",
      });

      expect(result).toEqual(mockQuote);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/quote"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"offeringId":12345'),
        }),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"countryCode":"US"'),
        }),
      );
    });

    it("defaults quantity to 1 when not specified", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuote),
        text: () => Promise.resolve(""),
      } as Response);

      await client.getQuote({
        offering_id: "123",
        page_count: 30,
        country: "US",
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"quantity":1'),
        }),
      );
    });

    it("uses provided quantity", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuote),
        text: () => Promise.resolve(""),
      } as Response);

      await client.getQuote({
        offering_id: "123",
        page_count: 30,
        country: "US",
        quantity: 5,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"quantity":5'),
        }),
      );
    });

    it("throws error when quote API fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("Bad Request"),
      } as Response);

      await expect(
        client.getQuote({
          offering_id: "invalid",
          page_count: 30,
          country: "US",
        }),
      ).rejects.toThrow("Peecho API error");
    });
  });
});
