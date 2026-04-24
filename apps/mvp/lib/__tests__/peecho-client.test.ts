import { describe, it, expect, beforeEach, vi } from "vitest";
import { peechoClient } from "../peecho/client";

// Mock fetch globally
global.fetch = vi.fn();

describe("peechoClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PEECHO_API_KEY = "test-api-key";
    process.env.PEECHO_API_URL = "https://sandbox.peecho.com/api/v1";
  });

  describe("getOfferings", () => {
    it("fetches offerings successfully", async () => {
      const mockOfferings = [
        {
          id: "offering-1",
          name: "Softcover Booklet",
          min_pages: 20,
          max_pages: 100,
          width_mm: 210,
          height_mm: 297,
        },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOfferings),
      } as Response);

      const result = await peechoClient.getOfferings();

      expect(result).toEqual(mockOfferings);
      expect(fetch).toHaveBeenCalledWith(
        "https://sandbox.peecho.com/api/v1/products",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );
    });

    it("throws error when API call fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(peechoClient.getOfferings()).rejects.toThrow();
    });
  });

  describe("getQuote", () => {
    it("fetches quote successfully", async () => {
      const mockQuote = {
        offering_id: "offering-1",
        page_count: 30,
        country: "US",
        product_amount: 12.5,
        shipping_amount: 5.0,
        tax_amount: 1.75,
        total_amount: 19.25,
        currency: "USD",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuote),
      } as Response);

      const result = await peechoClient.getQuote({
        offering_id: "offering-1",
        page_count: 30,
        country: "US",
      });

      expect(result).toEqual(mockQuote);
    });

    it("includes all required parameters in request", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await peechoClient.getQuote({
        offering_id: "offering-1",
        page_count: 30,
        country: "US",
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/quote"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("offering_id"),
        })
      );
    });

    it("throws error when quote API fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      } as Response);

      await expect(
        peechoClient.getQuote({
          offering_id: "invalid",
          page_count: 30,
          country: "US",
        })
      ).rejects.toThrow();
    });
  });
});
