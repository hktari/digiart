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

  describe("getCountries", () => {
    const PRODUCTION_COUNTRIES_RESPONSE = {
      "7011275": [
        "Afghanistan",
        "Albania",
        "Australia-ACT",
        "Australia-NSW",
        "Australia-NT",
        "Australia-QLD",
        "Australia-SA",
        "Australia-TAS",
        "Australia-VIC",
        "Australia-WA",
        "Austria",
        "Belgium",
        "Bulgaria",
        "Canada-AB",
        "Canada-BC",
        "Canada-ON",
        "Canada-QC",
        "China",
        "Cote D'Ivoire",
        "Croatia",
        "Cyprus",
        "Czech Republic",
        "Denmark",
        "Estonia",
        "Finland",
        "France",
        "Germany",
        "Greece",
        "Hungary",
        "Ireland",
        "Italy",
        "Korea Republic of",
        "Latvia",
        "Lithuania",
        "Luxembourg",
        "Macedonia the former Yugoslav Republic of",
        "Malta",
        "Netherlands",
        "Poland",
        "Portugal",
        "Qatar State of",
        "Romania",
        "Slovakia",
        "Slovenia",
        "Spain",
        "Sweden",
        "United Kingdom",
        "United States of America-AK",
        "United States of America-AL",
        "United States of America-AR",
        "United States of America-AZ",
        "United States of America-CA",
        "United States of America-CO",
        "United States of America-CT",
        "United States of America-DC",
        "United States of America-DE",
        "United States of America-FL",
        "United States of America-GA",
        "United States of America-HI",
        "United States of America-IA",
        "United States of America-ID",
        "United States of America-IL",
        "United States of America-IN",
        "United States of America-KS",
        "United States of America-KY",
        "United States of America-LA",
        "United States of America-MA",
        "United States of America-MD",
        "United States of America-ME",
        "United States of America-MI",
        "United States of America-MN",
        "United States of America-MO",
        "United States of America-MS",
        "United States of America-MT",
        "United States of America-NC",
        "United States of America-ND",
        "United States of America-NE",
        "United States of America-NH",
        "United States of America-NJ",
        "United States of America-NM",
        "United States of America-NV",
        "United States of America-NY",
        "United States of America-OH",
        "United States of America-OK",
        "United States of America-OR",
        "United States of America-PA",
        "United States of America-RI",
        "United States of America-SC",
        "United States of America-SD",
        "United States of America-TN",
        "United States of America-TX",
        "United States of America-UT",
        "United States of America-VA",
        "United States of America-VT",
        "United States of America-WA",
        "United States of America-WI",
        "United States of America-WV",
        "United States of America-WY",
        "Viet Nam",
        "Zimbabwe",
      ],
    };

    it("parses production format { offeringId: [...country names] } and maps all countries to ISO codes", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(PRODUCTION_COUNTRIES_RESPONSE),
        text: () => Promise.resolve(""),
      } as Response);

      const result = await client.getCountries(["7011275"]);
      const codes = result.map((c) => c.code);

      expect(codes).toContain("US");
      expect(codes).toContain("AT");
      expect(codes).toContain("BE");
      expect(codes).toContain("FR");
      expect(codes).toContain("DE");
      expect(codes).toContain("IT");
      expect(codes).toContain("NL");
      expect(codes).toContain("PL");
      expect(codes).toContain("ES");
      expect(codes).toContain("SE");

      expect(codes).toContain("AU");
      expect(codes).toContain("CA");
      expect(codes).toContain("GB");
      expect(codes).toContain("CN");
      expect(codes).toContain("VN");
      expect(codes).toContain("QA");
      expect(codes).toContain("AF");

      expect(result.find((c) => c.code === "US")?.name).toBe("United States");
      expect(result.find((c) => c.code === "FR")?.name).toBe("France");
      expect(result.find((c) => c.code === "AU")?.name).toBe("Australia");
      expect(result.find((c) => c.code === "CA")?.name).toBe("Canada");
      expect(result.find((c) => c.code === "GB")?.name).toBe("United Kingdom");
      expect(result.find((c) => c.code === "QA")?.name).toBe("Qatar State of");
    });

    it("extracts all 50 US state codes + DC from production format", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(PRODUCTION_COUNTRIES_RESPONSE),
        text: () => Promise.resolve(""),
      } as Response);

      const result = await client.getUSStateCodes(["7011275"]);

      expect(result).toContain("AK");
      expect(result).toContain("CA");
      expect(result).toContain("NY");
      expect(result).toContain("TX");
      expect(result).toContain("DC");
      expect(result).toContain("WY");
      expect(result).toHaveLength(51);
      expect(result).toEqual([...result].sort());
    });

    it("collapses Australia and Canada sub-regions into AU and CA, not extracted as US states", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(PRODUCTION_COUNTRIES_RESPONSE),
        text: () => Promise.resolve(""),
      } as Response);

      const result = await client.getUSStateCodes(["7011275"]);

      expect(result).not.toContain("ACT");
      expect(result).not.toContain("NSW");
      expect(result).not.toContain("AB");
      expect(result).not.toContain("BC");
      expect(result).not.toContain("ON");
      expect(result).not.toContain("QC");
    });

    it("handles entries with non-standard names like 'Cote D\\'Ivoire' and 'Korea Republic of' without crashing", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(PRODUCTION_COUNTRIES_RESPONSE),
        text: () => Promise.resolve(""),
      } as Response);

      await expect(client.getCountries(["7011275"])).resolves.not.toThrow();
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
