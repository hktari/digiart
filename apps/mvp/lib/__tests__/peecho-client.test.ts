import { describe, it, expect, beforeEach, vi } from "vitest";
import { PeechoClient } from "../peecho/client";

// Mock fetch globally
global.fetch = vi.fn();

describe("PeechoClient", () => {
  let client: PeechoClient;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PEECHO_API_KEY = "test-api-key";
    process.env.PEECHO_API_URL = "https://test.www.peecho.com/rest/v2";
    client = new PeechoClient();
  });

  describe("getOfferings", () => {
    it("fetches offerings and returns the offerings array", async () => {
      const mockOfferings = [
        {
          id: "offering-1",
          name: "Softcover Booklet",
          minNumberOfPages: 20,
          maxNumberOfPages: 100,
          dimensionWidth: 210,
          dimensionHeight: 297,
        },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ offerings: mockOfferings }),
        text: () => Promise.resolve(""),
      } as Response);

      const result = await client.getOfferings();

      expect(result).toEqual(mockOfferings);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/offerings"),
        expect.any(Object),
      );
    });

    it("returns empty array when offerings property is missing", async () => {
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
    it("fetches quote with correct parameters", async () => {
      const mockQuote = {
        product_amount: 12.5,
        shipping_amount: 5.0,
        tax_amount: 1.75,
        total_amount: 19.25,
        currency: "USD",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuote),
        text: () => Promise.resolve(""),
      } as Response);

      const result = await client.getQuote({
        offering_id: "offering-1",
        page_count: 30,
        country: "US",
      });

      expect(result).toEqual(mockQuote);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/quotes"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"offering_id":"offering-1"'),
        }),
      );
    });

    it("defaults quantity to 1 when not specified", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            product_amount: 0,
            shipping_amount: 0,
            tax_amount: 0,
            total_amount: 0,
            currency: "USD",
          }),
        text: () => Promise.resolve(""),
      } as Response);

      await client.getQuote({
        offering_id: "o1",
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
        json: () =>
          Promise.resolve({
            product_amount: 0,
            shipping_amount: 0,
            tax_amount: 0,
            total_amount: 0,
            currency: "USD",
          }),
        text: () => Promise.resolve(""),
      } as Response);

      await client.getQuote({
        offering_id: "o1",
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
