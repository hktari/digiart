import { logger } from "@/lib/logger";

const PEECHO_API_URL =
  process.env.PEECHO_ENV?.toLowerCase() === "production"
    ? "https://www.peecho.com/rest/v3"
    : "https://test.www.peecho.com/rest/v3";

export const PEECHO_DASHBOARD_URL =
  process.env.PEECHO_ENV?.toLowerCase() === "production"
    ? "https://www.peecho.com/mio-dashboard"
    : "https://test.www.peecho.com/mio-dashboard";

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

/**
 * Peecho Quote item pricing fields (verified against actual API responses):
 *
 * productPrice = quantity * (basePrice + pricePerPage * numberOfPages)
 * totalItemPrice = productPrice + shippingWholesale - totalQuantityDiscount
 *
 * Note: basePrice and pricePerPage already include any profit markup
 * configured in the Peecho dashboard. There is no separate markup field.
 */
export interface PeechoQuoteItem {
  offeringId: number;
  numberOfPages: number;
  quantity: number;
  /** Per-unit base price (includes Peecho dashboard profit markup). */
  basePrice: number;
  /** Per-page wholesale price. */
  pricePerPage: number;
  /** = quantity * (basePrice + pricePerPage * numberOfPages) */
  productPrice: number;
  /** Shipping cost for the full quantity. */
  shippingWholesale: number;
  /** Volume discount applied to the item. */
  totalQuantityDiscount: number;
  vatPercentage: number;
  vat: number;
  /** = productPrice + shippingWholesale - totalQuantityDiscount */
  totalItemPrice: number;
}

export interface PeechoQuoteParams {
  offering_id: string;
  page_count: number;
  country: string;
  country_state_code?: string;
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
  // file_details is optional for async creation (files attached later via /order/files)
  file_details?: {
    content_url: string;
    content_width: number;
    content_height: number;
    number_of_pages: number;
    cover_url?: string;
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

// Order details response from GET /rest/v3/order/details
export interface PeechoOrderDetails {
  order_id: number;
  order_reference: string;
  order_state: string;
  currency: string;
  total_wholesale_price_inc_taxes: number;
  total_retail_price_inc_taxes: number;
  total_shipping_price: number;
  vat_summary: Array<{
    vat_percentage: number;
    vat_amount: number;
  }>;
  items: Array<{
    item_id: number;
    item_reference: string;
    offering_id: number;
    quantity: number;
    number_of_pages: number;
    state: string;
  }>;
  shipping_address: {
    first_name: string;
    last_name: string;
    address_line_1: string;
    address_line_2?: string;
    zip_code: string;
    city: string;
    state?: string;
    country_code: string;
  };
  billing_address?: {
    first_name: string;
    last_name: string;
    address_line_1: string;
    address_line_2?: string;
    zip_code: string;
    city: string;
    state?: string;
    country_code: string;
  };
  email_address: string;
}

// Address update params for POST /rest/v3/order/address
export interface PeechoAddressDetails {
  email_address: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    address_line_1: string;
    address_line_2?: string;
    zip_code: string;
    city: string;
    state?: string | null;
    country_code: string;
  };
  billing_address?: {
    first_name: string;
    last_name: string;
    address_line_1: string;
    address_line_2?: string;
    zip_code: string;
    city: string;
    state?: string | null;
    country_code: string;
  };
}

// File attachment params for POST /rest/v3/order/files
export interface PeechoFileDetails {
  content_url: string;
  content_width: number;
  content_height: number;
  number_of_pages: number;
  cover_url?: string;
  spine_details?: {
    custom_spine_url?: string;
    dynamic_spine_details?: {
      text_font?: string;
      text_size?: number;
      text_colour?: string;
      text_top?: string;
      text_center?: string;
      text_bottom?: string;
    };
  };
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

  const nameToCode = new Map<string, string>([
    ["Afghanistan", "AF"],
    ["Aland Islands", "AX"],
    ["Albania", "AL"],
    ["Algeria", "DZ"],
    ["American Samoa", "AS"],
    ["Andorra", "AD"],
    ["Angola", "AO"],
    ["Anguilla", "AI"],
    ["Antarctica", "AQ"],
    ["Antigua and Barbuda", "AG"],
    ["Armenia", "AM"],
    ["Aruba", "AW"],
    ["Austria", "AT"],
    ["Azerbaijan", "AZ"],
    ["Bahamas", "BS"],
    ["Bahrain", "BH"],
    ["Bangladesh", "BD"],
    ["Barbados", "BB"],
    ["Belgium", "BE"],
    ["Belize", "BZ"],
    ["Benin", "BJ"],
    ["Bhutan", "BT"],
    ["Bolivia", "BO"],
    ["Bonaire Sint Eustatius and Saba", "BQ"],
    ["Bosnia and Herzegovina", "BA"],
    ["Botswana", "BW"],
    ["Bouvet Island", "BV"],
    ["British Indian Ocean Territory", "IO"],
    ["British Virgin Islands", "VG"],
    ["Brunei Darussalam", "BN"],
    ["Bulgaria", "BG"],
    ["Burkina Faso", "BF"],
    ["Burundi", "BI"],
    ["Cambodia", "KH"],
    ["Cameroon", "CM"],
    ["Canary Islands", "IC"],
    ["Cape Verde", "CV"],
    ["Cayman Islands", "KY"],
    ["Central African Republic", "CF"],
    ["Chad", "TD"],
    ["Chile", "CL"],
    ["China", "CN"],
    ["Christmas Island", "CX"],
    ["Cocos (Keeling) Islands", "CC"],
    ["Colombia", "CO"],
    ["Comoros", "KM"],
    ["Congo", "CG"],
    ["Congo (the Democratic Republic of the)", "CD"],
    ["Cook Islands", "CK"],
    ["Costa Rica", "CR"],
    ["Cote D'Ivoire", "CI"],
    ["Croatia", "HR"],
    ["Cuba", "CU"],
    ["Curacao", "CW"],
    ["Cyprus", "CY"],
    ["Czech Republic", "CZ"],
    ["Denmark", "DK"],
    ["Djibouti", "DJ"],
    ["Dominica", "DM"],
    ["Dominican Republic", "DO"],
    ["El Salvador", "SV"],
    ["Equatorial Guinea", "GQ"],
    ["Eritrea", "ER"],
    ["Estonia", "EE"],
    ["Ethiopia", "ET"],
    ["Falkland Islands", "FK"],
    ["Faroe Islands", "FO"],
    ["Fiji", "FJ"],
    ["Finland", "FI"],
    ["France", "FR"],
    ["French Guiana", "GF"],
    ["French Polynesia", "PF"],
    ["French Southern Territories", "TF"],
    ["Gabon", "GA"],
    ["Gambia", "GM"],
    ["Georgia", "GE"],
    ["Germany", "DE"],
    ["Ghana", "GH"],
    ["Gibraltar", "GI"],
    ["Greece", "GR"],
    ["Greenland", "GL"],
    ["Grenada", "GD"],
    ["Guadaloupe", "GP"],
    ["Guam", "GU"],
    ["Guatemala", "GT"],
    ["Guernsey", "GG"],
    ["Guinea", "GN"],
    ["Guinea-Bissau", "GW"],
    ["Guyana", "GY"],
    ["Haiti", "HT"],
    ["Heard and McDonald Islands", "HM"],
    ["Holy See (Vatican City State)", "VA"],
    ["Honduras", "HN"],
    ["Hong Kong", "HK"],
    ["Hungary", "HU"],
    ["Iceland", "IS"],
    ["India", "IN"],
    ["Indonesia", "ID"],
    ["Ireland", "IE"],
    ["Isle of Man", "IM"],
    ["Italy", "IT"],
    ["Jamaica", "JM"],
    ["Japan", "JP"],
    ["Jersey", "JE"],
    ["Jordan", "JO"],
    ["Kazakhstan", "KZ"],
    ["Kenya", "KE"],
    ["Kiribati", "KI"],
    ["Korea Democratic People's Republic of", "KP"],
    ["Korea Republic of", "KR"],
    ["Kosovo", "XK"],
    ["Kuwait", "KW"],
    ["Kyrgyz Republic", "KG"],
    ["Lao People's Democratic Republic", "LA"],
    ["Latvia", "LV"],
    ["Lebanon", "LB"],
    ["Lesotho", "LS"],
    ["Liberia", "LR"],
    ["Libyan Arab Jamahiriya", "LY"],
    ["Liechtenstein", "LI"],
    ["Lithuania", "LT"],
    ["Luxembourg", "LU"],
    ["Macao", "MO"],
    ["Macedonia the former Yugoslav Republic of", "MK"],
    ["Madagascar", "MG"],
    ["Malawi", "MW"],
    ["Malaysia", "MY"],
    ["Maldives", "MV"],
    ["Mali", "ML"],
    ["Malta", "MT"],
    ["Marshall Islands", "MH"],
    ["Martinique", "MQ"],
    ["Mauritania", "MR"],
    ["Mauritius", "MU"],
    ["Mayotte", "YT"],
    ["Micronesia", "FM"],
    ["Monaco", "MC"],
    ["Mongolia", "MN"],
    ["Montenegro", "ME"],
    ["Montserrat", "MS"],
    ["Mozambique", "MZ"],
    ["Myanmar", "MM"],
    ["Namibia", "NA"],
    ["Nauru", "NR"],
    ["Nepal", "NP"],
    ["Netherlands", "NL"],
    ["New Caledonia", "NC"],
    ["New Zealand", "NZ"],
    ["Nicaragua", "NI"],
    ["Niger", "NE"],
    ["Nigeria", "NG"],
    ["Niue", "NU"],
    ["Norfolk Island", "NF"],
    ["Northern Mariana Islands", "MP"],
    ["Oman", "OM"],
    ["Pakistan", "PK"],
    ["Palau", "PW"],
    ["Panama", "PA"],
    ["Papua New Guinea", "PG"],
    ["Peru", "PE"],
    ["Philippines", "PH"],
    ["Pitcairn Island", "PN"],
    ["Poland", "PL"],
    ["Portugal", "PT"],
    ["Puerto Rico", "PR"],
    ["Qatar State of", "QA"],
    ["Romania", "RO"],
    ["Rwanda", "RW"],
    ["Saint Barthelemy", "BL"],
    ["Saint Martin (French part)", "MF"],
    ["Samoa", "WS"],
    ["San Marino", "SM"],
    ["Sao Tome and Principe", "ST"],
    ["Saudi Arabia", "SA"],
    ["Senegal", "SN"],
    ["Serbia", "RS"],
    ["Seychelles", "SC"],
    ["Sierra Leone", "SL"],
    ["Singapore", "SG"],
    ["Sint Maarten (Dutch part)", "SX"],
    ["Slovakia", "SK"],
    ["Slovenia", "SI"],
    ["Solomon Islands", "SB"],
    ["Somalia", "SO"],
    ["South Africa", "ZA"],
    ["South Georgia and the South Sandwich Islands", "GS"],
    ["South Sudan", "SS"],
    ["Spain", "ES"],
    ["Sri Lanka", "LK"],
    ["St Helena", "SH"],
    ["St Kitts and Nevis", "KN"],
    ["St Lucia", "LC"],
    ["St Pierre and Miquelon", "PM"],
    ["St Vincent and the Grenadines", "VC"],
    ["Sudan", "SD"],
    ["Suriname", "SR"],
    ["Svalbard & Jan Mayen Islands", "SJ"],
    ["Swaziland", "SZ"],
    ["Sweden", "SE"],
    ["Switzerland", "CH"],
    ["Syrian Arab Republic", "SY"],
    ["Taiwan", "TW"],
    ["Tajikistan", "TJ"],
    ["Tanzania", "TZ"],
    ["Thailand", "TH"],
    ["Timor-Leste", "TL"],
    ["Togo", "TG"],
    ["Tokelau", "TK"],
    ["Tonga", "TO"],
    ["Trinidad and Tobago", "TT"],
    ["Tunisia", "TN"],
    ["Turkmenistan", "TM"],
    ["Turks and Caicos Islands", "TC"],
    ["Tuvalu", "TV"],
    ["US Virgin Islands", "VI"],
    ["Uganda", "UG"],
    ["United Kingdom", "GB"],
    ["United States Minor Outlying Islands", "UM"],
    ["Uzbekistan", "UZ"],
    ["Vanuatu", "VU"],
    ["Venezuela", "VE"],
    ["Viet Nam", "VN"],
    ["Wallis and Futuna Islands", "WF"],
    ["Western Sahara", "EH"],
    ["Yemen", "YE"],
    ["Zambia", "ZM"],
    ["Zimbabwe", "ZW"],
  ]);
  const codeToName = new Map<string, string>([
    ["US", "United States"],
    ...[...nameToCode.entries()].map(([name, code]): [string, string] => [
      code,
      name,
    ]),
  ]);
  const dedup = new Map<string, string>();

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      for (const countryName of value) {
        if (countryName.startsWith("United States of America-")) {
          dedup.set("US", "United States");
          continue;
        }

        const auMatch = countryName.match(/^Australia-[A-Z]{2,3}$/);
        if (auMatch) {
          dedup.set("AU", "Australia");
          continue;
        }
        const caMatch = countryName.match(/^Canada-[A-Z]{2}$/);
        if (caMatch) {
          dedup.set("CA", "Canada");
          continue;
        }

        const code = nameToCode.get(countryName);
        if (code) {
          dedup.set(code, codeToName.get(code) || countryName);
        } else {
          logger.warn("Peecho: unmapped country name, skipping", {
            countryName,
          });
        }
      }
      continue;
    }

    if (/^[A-Z]{2}$/i.test(key)) {
      const code = key.toUpperCase();
      dedup.set(code, codeToName.get(code) || code);
    }
  }

  return [...dedup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, name]) => ({ code, name }));
}

function extractUsStateCodes(data: PeechoCountriesApiResponse): string[] {
  if (Array.isArray(data)) return [];
  if ("countries" in data && Array.isArray(data.countries)) return [];

  const stateCodes = new Set<string>();
  for (const value of Object.values(data)) {
    if (!Array.isArray(value)) continue;

    for (const countryName of value) {
      const match = countryName.match(/^United States of America-([A-Z]{2})$/);
      if (match?.[1]) {
        stateCodes.add(match[1]);
      }
    }
  }

  return [...stateCodes].sort((a, b) => a.localeCompare(b));
}

export class PeechoClient {
  private apiUrl: string;
  private merchantApiKey: string;
  private countriesCacheTtl: number;
  private countriesCache: Map<
    string,
    { data: PeechoCountry[]; timestamp: number }
  >;

  constructor() {
    this.apiUrl = process.env.PEECHO_API_URL || PEECHO_API_URL;
    this.merchantApiKey = process.env.PEECHO_MERCHANT_API_KEY || "";

    if (!this.merchantApiKey) {
      logger.warn(
        "PEECHO_MERCHANT_API_KEY is not set. Peecho integration will not work.",
      );
    }

    // Cache with 1 hour TTL, keyed by sorted offering IDs
    this.countriesCacheTtl = 60 * 60 * 1000;
    this.countriesCache = new Map();
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

  async getOfferings(filters?: {
    categoryFilter?: string;
    subCategoryFilter?: string;
  }): Promise<PeechoOffering[]> {
    try {
      const params: Record<string, string> = {
        merchantApiKey: this.merchantApiKey,
      };

      if (filters?.categoryFilter) {
        params.categoryFilter = filters.categoryFilter;
      }

      if (filters?.subCategoryFilter) {
        params.subCategoryFilter = filters.subCategoryFilter;
      }

      const data = await this.get<OfferingsApiResponse>(
        "/offering/list",
        params,
      );

      const offerings: PeechoOffering[] = [];
      for (const categories of Object.values(data)) {
        for (const items of Object.values(categories)) {
          offerings.push(...items);
        }
      }
      return offerings;
    } catch (error) {
      logger.error("Failed to fetch Peecho offerings", error);
      throw error;
    }
  }

  async getQuote(params: PeechoQuoteParams): Promise<PeechoQuoteResponse> {
    try {
      const quotePayload: {
        apiKey: string;
        countryCode: string;
        countryStateCode?: string;
        currency: string;
        items: Array<{
          offeringId: number;
          numberOfPages: number;
          quantity: number;
        }>;
      } = {
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
      };

      if (params.country_state_code) {
        quotePayload.countryStateCode = params.country_state_code;
      }

      const data = await this.post<PeechoQuoteResponse>("/quote", {
        ...quotePayload,
      });
      return data;
    } catch (error) {
      logger.error("Failed to get Peecho quote", error, {
        country: params.country,
        pageCount: params.page_count,
        offeringId: params.offering_id,
      });
      throw error;
    }
  }

  async createOrder(
    params: PeechoCreateOrderParams,
  ): Promise<PeechoCreateOrderResponse> {
    try {
      const payload = {
        merchant_api_key: this.merchantApiKey,
        currency: params.currency ?? "EUR",
        order_reference: params.order_reference,
        item_details: params.item_details,
        address_details: params.address_details,
      };
      logger.info("[Peecho] Creating order with payload", {
        url: `${this.apiUrl}/order/`,
        hasApiKey: !!this.merchantApiKey,
        apiKeyPrefix: this.merchantApiKey.slice(0, 8),
        payload: JSON.stringify(payload, null, 2),
      });
      const data = await this.post<PeechoCreateOrderResponse>(
        "/order/",
        payload,
      );
      return data;
    } catch (error) {
      logger.error("Failed to create Peecho order", error, {
        orderReference: params.order_reference,
      });
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
      logger.error("Failed to pay Peecho order", error, { orderId });
      throw error;
    }
  }

  async getOrderDetails(orderId: number): Promise<PeechoOrderDetails> {
    try {
      const data = await this.get<PeechoOrderDetails>("/order/details", {
        merchantApiKey: this.merchantApiKey,
        orderId: String(orderId),
      });
      return data;
    } catch (error) {
      logger.error("Failed to get Peecho order details", error, { orderId });
      throw error;
    }
  }

  async updateOrderAddress(
    orderId: number,
    addressDetails: PeechoAddressDetails,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const data = await this.post<{ success: boolean; message?: string }>(
        "/order/address",
        {
          order_id: orderId,
          merchant_api_key: this.merchantApiKey,
          address_details: addressDetails,
        },
      );
      return data;
    } catch (error) {
      logger.error("Failed to update Peecho order address", error, { orderId });
      throw error;
    }
  }

  async attachOrderFiles(
    orderId: number,
    itemReference: string,
    fileDetails: PeechoFileDetails,
  ): Promise<{ success: boolean }> {
    try {
      const data = await this.post<{ success: boolean }>("/order/files", {
        order_id: orderId,
        merchant_api_key: this.merchantApiKey,
        file_details: {
          item_reference: itemReference,
          ...fileDetails,
        },
      });
      return data;
    } catch (error) {
      logger.error("Failed to attach files to Peecho order", error, {
        orderId,
        itemReference,
      });
      throw error;
    }
  }

  async getCountries(offeringIds?: string[]): Promise<PeechoCountry[]> {
    const now = Date.now();

    try {
      const resolvedOfferingIds =
        offeringIds && offeringIds.length > 0
          ? offeringIds
          : (await this.getOfferings()).map((offering) =>
              offering.id.toString(),
            );

      const cacheKey = [...resolvedOfferingIds].sort().join(",");
      const cached = this.countriesCache.get(cacheKey);
      if (cached && now - cached.timestamp < this.countriesCacheTtl) {
        return cached.data;
      }

      const data = await this.post<PeechoCountriesApiResponse>(
        "/offering/countries",
        {
          merchantApiKey: this.merchantApiKey,
          offeringsId: resolvedOfferingIds,
        },
      );
      logger.info("Peecho /offering/countries raw response", {
        offeringIds: resolvedOfferingIds,
        responseType: Array.isArray(data) ? "array" : typeof data,
        responseKeys: Array.isArray(data)
          ? null
          : Object.keys(data as object).slice(0, 10),
        responsePreview: JSON.stringify(data).slice(0, 500),
      });
      let countries = normalizeCountriesResponse(data);
      logger.info("Peecho countries after normalization", {
        count: countries.length,
        countries: countries.slice(0, 5),
      });

      // Some merchant catalogues return no countries for bulk offering lookups.
      // Fallback to per-offering requests and merge results.
      if (countries.length === 0 && resolvedOfferingIds.length > 1) {
        const merged = new Map<string, PeechoCountry>();

        for (const offeringId of resolvedOfferingIds) {
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

      // Update cache only when we have actual data (avoid caching empty responses)
      if (countries.length > 0) {
        this.countriesCache.set(cacheKey, { data: countries, timestamp: now });
      }

      return countries;
    } catch (error) {
      logger.error("Failed to fetch Peecho countries", error);
      throw error;
    }
  }

  async getUSStateCodes(offeringIds?: string[]): Promise<string[]> {
    try {
      const resolvedOfferingIds =
        offeringIds && offeringIds.length > 0
          ? offeringIds
          : (await this.getOfferings()).map((offering) =>
              offering.id.toString(),
            );

      const data = await this.post<PeechoCountriesApiResponse>(
        "/offering/countries",
        {
          merchantApiKey: this.merchantApiKey,
          offeringsId: resolvedOfferingIds,
        },
      );

      let stateCodes = extractUsStateCodes(data);
      if (stateCodes.length > 0) {
        return stateCodes;
      }

      // Same fallback behavior as country sync when bulk calls are empty.
      const merged = new Set<string>();
      for (const offeringId of resolvedOfferingIds) {
        const singleData = await this.post<PeechoCountriesApiResponse>(
          "/offering/countries",
          {
            merchantApiKey: this.merchantApiKey,
            offeringsId: [offeringId],
          },
        );

        for (const stateCode of extractUsStateCodes(singleData)) {
          merged.add(stateCode);
        }
      }

      stateCodes = [...merged].sort((a, b) => a.localeCompare(b));
      return stateCodes;
    } catch (error) {
      logger.error("Failed to fetch Peecho US state codes", error);
      throw error;
    }
  }
}

export const peechoClient = new PeechoClient();
