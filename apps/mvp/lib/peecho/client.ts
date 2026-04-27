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

type OfferingsApiResponse = Record<string, Record<string, PeechoOffering[]>>;

export class PeechoClient {
  private apiUrl: string;
  private merchantApiKey: string;

  constructor() {
    this.apiUrl = process.env.PEECHO_API_URL || PEECHO_API_URL;
    this.merchantApiKey = process.env.PEECHO_MERCHANT_API_KEY || "";

    if (!this.merchantApiKey) {
      console.warn(
        "PEECHO_MERCHANT_API_KEY is not set. Peecho integration will not work.",
      );
    }
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
        ...(params.currency ? { currency: params.currency } : {}),
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
}

export const peechoClient = new PeechoClient();
