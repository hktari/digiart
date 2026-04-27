const PEECHO_API_URL =
  process.env.PEECHO_API_URL || "https://test.www.peecho.com/rest/v2";

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

export interface PeechoQuoteParams {
  offering_id: string;
  page_count: number;
  country: string;
  quantity?: number;
  currency?: string;
}

export interface PeechoQuoteResponse {
  offering_id: number;
  number_of_pages: number;
  quantity: number;
  country_code: string;
  base_price: string;
  price_per_page: string;
  product_price: string;
  shipping_wholesale: string;
  total_quantity_discount: string;
  vat_percentage: string;
  vat: string;
  total_price: string;
  currency: string;
  exchange_rate: string;
}

type OfferingsApiResponse = Record<string, Record<string, PeechoOffering[]>>;

export class PeechoClient {
  private apiUrl: string;
  private buttonKey: string;
  private merchantApiKey: string;

  constructor() {
    this.apiUrl = process.env.PEECHO_API_URL || PEECHO_API_URL;
    this.buttonKey = process.env.PEECHO_BUTTON_KEY || "";
    this.merchantApiKey = process.env.PEECHO_MERCHANT_API_KEY || "";

    if (!this.buttonKey || !this.merchantApiKey) {
      console.warn(
        "PEECHO_BUTTON_KEY or PEECHO_MERCHANT_API_KEY is not set. Peecho integration will not work.",
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

  async getOfferings(): Promise<PeechoOffering[]> {
    try {
      const data = await this.get<OfferingsApiResponse>("/offering/list", {
        buttonKey: this.buttonKey,
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
      const data = await this.get<PeechoQuoteResponse>("/offering/quote", {
        merchantApiKey: this.merchantApiKey,
        offeringId: params.offering_id,
        numberOfPages: params.page_count.toString(),
        quantity: (params.quantity ?? 1).toString(),
        countryCodeIso2: params.country,
        ...(params.currency ? { currency: params.currency } : {}),
      });
      return data;
    } catch (error) {
      console.error("Failed to get Peecho quote:", error);
      throw error;
    }
  }
}

export const peechoClient = new PeechoClient();
