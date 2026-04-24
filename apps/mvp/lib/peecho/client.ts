const PEECHO_API_URL =
  process.env.PEECHO_API_URL || "https://sandbox.peecho.com/api/v1";
const PEECHO_API_KEY = process.env.PEECHO_API_KEY;

if (!PEECHO_API_KEY) {
  console.warn("PEECHO_API_KEY is not set. Peecho integration will not work.");
}

interface PeechoOffering {
  id: string;
  name: string;
  min_pages: number;
  max_pages: number;
  width_mm?: number;
  height_mm?: number;
  pricing?: unknown;
}

interface PeechoQuoteParams {
  offering_id: string;
  page_count: number;
  country: string;
  quantity?: number;
}

interface PeechoQuoteResponse {
  product_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
}

export class PeechoClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = PEECHO_API_URL;
    this.apiKey = PEECHO_API_KEY || "";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
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
      const data = await this.request<{ offerings: PeechoOffering[] }>(
        "/offerings",
      );
      return data.offerings || [];
    } catch (error) {
      console.error("Failed to fetch Peecho offerings:", error);
      throw error;
    }
  }

  async getQuote(params: PeechoQuoteParams): Promise<PeechoQuoteResponse> {
    try {
      const data = await this.request<PeechoQuoteResponse>("/quotes", {
        method: "POST",
        body: JSON.stringify({
          offering_id: params.offering_id,
          page_count: params.page_count,
          country: params.country,
          quantity: params.quantity || 1,
        }),
      });
      return data;
    } catch (error) {
      console.error("Failed to get Peecho quote:", error);
      throw error;
    }
  }
}

export const peechoClient = new PeechoClient();
