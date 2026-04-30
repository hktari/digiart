const PEECHO_API_URL =
  process.env.PEECHO_API_URL || "https://test.www.peecho.com/rest/v3";

export interface PeechoOffering {
  id: number;
  name: string;
  catalogueItemCode: string;
  minimumQuantity: number;
  minNumberOfPages: number;
  maxNumberOfPages: number;
  dimensionWidth: number;
  dimensionHeight: number;
  dynamicSize: boolean;
  minDimensionWidth?: number;
  minDimensionHeight?: number;
  pricingDto?: {
    currency: string;
    price: number;
    pricePerPage: number;
  };
  pagesIncludedInBasePrice: number;
}

export interface PeechoQuoteItem {
  offeringId: number;
  numberOfPages: number;
  quantity: number;
  basePrice: number;
  pricePerPage: number;
  productPrice: number;
  shippingWholesale: number;
  totalQuantityDiscount: number;
  vatPercentage: number;
  vat: number;
  totalItemPrice: number;
}

export interface PeechoQuoteParams {
  offering_id: string;
  page_count: number;
  country: string;
  quantity?: number;
  currency?: string;
}

export interface PeechoQuoteResponse {
  quoteDetails: {
    countryCode: string;
    state?: string;
    currency: string;
    exchangeRate: string;
  };
  quotedItems: PeechoQuoteItem[];
  quoteSummary: {
    numberOfItems: number;
    totalWholesalePrice: number;
    totalShippingPrice: number;
    vatSummary: { vatPercentage: number; vat: number }[];
    totalQuantityDiscount: number;
  };
}

export interface PeechoOrderItem {
  item_reference: string;
  offering_id: number;
  quantity: number;
  file_details: {
    content_url: string;
    content_width: number;
    content_height: number;
    number_of_pages: number;
    spine_details?: {
      dynamic_spine_details?: {
        text_font?: string;
        text_size?: number;
        text_colour?: string;
        text_top?: string;
        text_center?: string;
        text_bottom?: string;
      };
      custom_spine_url?: string;
    };
  };
}

export interface PeechoCreateOrderParams {
  currency?: string;
  order_reference?: string;
  item_details: PeechoOrderItem[];
  address_details: {
    email_address: string;
    shipping_address: {
      first_name: string;
      last_name: string;
      address_line_1: string;
      address_line_2?: string | number;
      zip_code: string;
      city: string;
      state?: string | null;
      country_code: string;
    };
  };
}

export interface PeechoCreateOrderResponse {
  order_id: number;
}

export interface PeechoPayOrderResponse {
  order_state: string;
}

export interface PeechoCountry {
  code: string;
  name: string;
}

export interface PeechoCountriesResponse {
  countries: PeechoCountry[];
}

type PeechoCountriesApiResponse =
  | PeechoCountry[]
  | PeechoCountriesResponse
  | Record<string, string | string[]>;

type OfferingsApiResponse = Record<string, Record<string, PeechoOffering[]>>;

function normalizeCountriesResponse(
  data: PeechoCountriesApiResponse,
): PeechoCountry[] {
  if (Array.isArray(data)) return data;

  if (
    "countries" in data &&
    Array.isArray(data.countries) &&
    data.countries.every(
      (country): country is PeechoCountry =>
        typeof country === "object" &&
        country !== null &&
        "code" in country &&
        "name" in country,
    )
  ) {
    return data.countries;
  }

  const euNameToCode = new Map<string, string>([
    ["Austria", "AT"],
    ["Belgium", "BE"],
    ["Bulgaria", "BG"],
    ["Croatia", "HR"],
    ["Cyprus", "CY"],
    ["Czech Republic", "CZ"],
    ["Denmark", "DK"],
    ["Estonia", "EE"],
    ["Finland", "FI"],
    ["France", "FR"],
    ["Germany", "DE"],
    ["Greece", "GR"],
    ["Hungary", "HU"],
    ["Ireland", "IE"],
    ["Italy", "IT"],
    ["Latvia", "LV"],
    ["Lithuania", "LT"],
    ["Luxembourg", "LU"],
    ["Malta", "MT"],
    ["Netherlands", "NL"],
    ["Poland", "PL"],
    ["Portugal", "PT"],
    ["Romania", "RO"],
    ["Slovakia", "SK"],
    ["Slovenia", "SI"],
    ["Spain", "ES"],
    ["Sweden", "SE"],
  ]);
  const codeToName = new Map<string, string>([
    ["US", "United States"],
    ...[...euNameToCode.entries()].map(([name, code]): [string, string] => [
      code,
      name,
    ]),
  ]);
  const dedup = new Set<string>();

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      for (const countryName of value) {
        if (countryName.startsWith("United States of America-")) {
          dedup.add("US");
          continue;
        }

        const euCode = euNameToCode.get(countryName);
        if (euCode) {
          dedup.add(euCode);
        }
      }
      continue;
    }

    if (/^[A-Z]{2}$/i.test(key)) {
      dedup.add(key.toUpperCase());
    }
  }

  return [...dedup]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({ code, name: codeToName.get(code) || code }));
}

export class PeechoClient {
  private apiUrl: string;
  private merchantApiKey: string;
  private offeringIds: string[];
  private countriesCache: {
    data: PeechoCountry[] | null;
    timestamp: number | null;
    ttl: number;
  };

  constructor() {
    this.apiUrl = process.env.PEECHO_API_URL || PEECHO_API_URL;
    this.merchantApiKey = process.env.PEECHO_MERCHANT_API_KEY || "";
    this.offeringIds =
      process.env.PEECHO_OFFERING_IDS?.split(",").map((id) => id.trim()) || [];

    if (!this.merchantApiKey) {
      console.warn(
        "PEECHO_MERCHANT_API_KEY is not set. Peecho integration will not work.",
      );
    }

    // Cache with 1 hour TTL
    this.countriesCache = {
      data: null,
      timestamp: null,
      ttl: 60 * 60 * 1000, // 1 hour in milliseconds
    };
  }

  private async get<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.apiUrl}${endpoint}${qs ? `?${qs}` : ""}`;

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Peecho API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Peecho API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }

  async getOfferings(): Promise<PeechoOffering[]> {
    try {
      const data = await this.get<OfferingsApiResponse>("/offering/list", {
        merchantApiKey: this.merchantApiKey,
      });

      const offerings: PeechoOffering[] = [];
      for (const categories of Object.values(data)) {
        for (const items of Object.values(categories)) {
          offerings.push(...items);
        }
      }
      return offerings;
    } catch (error) {
      console.error("Failed to fetch Peecho offerings:", error);
      throw error;
    }
  }

  async getQuote(params: PeechoQuoteParams): Promise<PeechoQuoteResponse> {
    try {
      const data = await this.post<PeechoQuoteResponse>("/quote", {
        apiKey: this.merchantApiKey,
        countryCode: params.country,
        currency: params.currency ?? "EUR",
        items: [
          {
            offeringId: parseInt(params.offering_id, 10),
            numberOfPages: params.page_count,
            quantity: params.quantity ?? 1,
          },
        ],
      });
      return data;
    } catch (error) {
      console.error("Failed to get Peecho quote:", error);
      throw error;
    }
  }

  async createOrder(
    params: PeechoCreateOrderParams,
  ): Promise<PeechoCreateOrderResponse> {
    try {
      const data = await this.post<PeechoCreateOrderResponse>("/order/", {
        merchant_api_key: this.merchantApiKey,
        currency: params.currency ?? "EUR",
        order_reference: params.order_reference,
        item_details: params.item_details,
        address_details: params.address_details,
      });
      return data;
    } catch (error) {
      console.error("Failed to create Peecho order:", error);
      throw error;
    }
  }

  async payOrder(
    orderId: number,
    secretKey: string,
  ): Promise<PeechoPayOrderResponse> {
    const { createHash } = await import("node:crypto");
    const secret = createHash("sha256")
      .update(`${secretKey}${orderId}`)
      .digest("hex");

    try {
      const data = await this.post<PeechoPayOrderResponse>("/order/payment/", {
        order_id: orderId,
        merchant_api_key: this.merchantApiKey,
        secret,
      });
      return data;
    } catch (error) {
      console.error("Failed to pay Peecho order:", error);
      throw error;
    }
  }

  async getCountries(): Promise<PeechoCountry[]> {
    // Check cache
    const now = Date.now();
    if (
      this.countriesCache.data &&
      this.countriesCache.timestamp &&
      now - this.countriesCache.timestamp < this.countriesCache.ttl
    ) {
      return this.countriesCache.data;
    }

    try {
      const offeringIds =
        this.offeringIds.length > 0
          ? this.offeringIds
          : (await this.getOfferings()).map((offering) =>
              offering.id.toString(),
            );

      const data = await this.post<PeechoCountriesApiResponse>(
        "/offering/countries",
        {
          merchantApiKey: this.merchantApiKey,
          offeringsId: offeringIds,
        },
      );
      let countries = normalizeCountriesResponse(data);

      // Some merchant catalogues return no countries for bulk offering lookups.
      // Fallback to per-offering requests and merge results.
      if (countries.length === 0 && offeringIds.length > 1) {
        const merged = new Map<string, PeechoCountry>();

        for (const offeringId of offeringIds) {
          const singleData = await this.post<PeechoCountriesApiResponse>(
            "/offering/countries",
            {
              merchantApiKey: this.merchantApiKey,
              offeringsId: [offeringId],
            },
          );

          for (const country of normalizeCountriesResponse(singleData)) {
            merged.set(country.code.toUpperCase(), {
              code: country.code.toUpperCase(),
              name: country.name,
            });
          }
        }

        countries = [...merged.values()].sort((a, b) =>
          a.code.localeCompare(b.code),
        );
      }

      // Update cache
      this.countriesCache = {
        data: countries,
        timestamp: now,
        ttl: this.countriesCache.ttl,
      };

      return countries;
    } catch (error) {
      console.error("Failed to fetch Peecho countries:", error);
      throw error;
    }
  }
}

export const peechoClient = new PeechoClient();
