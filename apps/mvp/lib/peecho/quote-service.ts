import { logger } from "@/lib/logger";
import { peechoClient } from "./client";

export interface QuoteParams {
  country: string;
  pageCount: number;
  offeringId?: string;
  countryStateCode?: string;
}

export interface QuoteResult {
  shippingAmount: number;
  productAmount: number;
  baseAmount: number;
  markupAmount: number;
  taxAmount: number;
  totalEstimate: number;
  wholesaleTotal: number;
  marginRate: number;
  currency: string;
  offeringId: string;
}

// PEECHO PRICING QUIRK:
// The Peecho /quote endpoint returns WHOLESALE prices only — the product price
// it returns does NOT include any platform markup. The Peecho /order endpoint,
// however, DOES include the final retail price with markup baked in (as
// configured in the Peecho merchant dashboard under "markup" or "margin").
//
// Consequence: to show collectors an accurate price estimate before checkout,
// we must manually calculate the markup using `PlatformConfig.quoteMarginAmount`
// (a fractional percentage, e.g. 0.3 = 30%) applied to the gross wholesale
// price (productPrice + vat): markup = (productPrice + vat) * margin.
// This margin must be kept in sync with the margin configured in the Peecho
// merchant dashboard.
//
// References:
//   - Peecho /v3/print/order/quote  → wholesale, no markup
//   - Peecho /v3/print/order/create → retail, markup included

export async function getQuote(params: QuoteParams): Promise<QuoteResult> {
  try {
    const normalizedCountry = params.country.toUpperCase();
    if (normalizedCountry === "US" && !params.countryStateCode) {
      throw new Error(
        "countryStateCode is required for US shipping quotes (e.g. CA, NY)",
      );
    }

    const { db } = await import("@/lib/db");

    let offeringId: string;

    if (!params.offeringId) {
      const defaultOffering = await db.podOffering.findFirst({
        where: {
          isActive: true,
          minPages: { lte: params.pageCount },
          maxPages: { gte: params.pageCount },
        },
        orderBy: { createdAt: "asc" },
      });

      if (!defaultOffering) {
        throw new Error(
          "No suitable offering found for the requested page count",
        );
      }

      offeringId = defaultOffering.externalId;
    } else {
      offeringId = params.offeringId;
    }

    // Read platform margin percentage (e.g. 0.3 = 30%).
    // Falls back to 0.3 if no PlatformConfig row exists yet.
    const platformConfig = await db.platformConfig.findFirst();
    const margin = platformConfig?.quoteMarginAmount ?? 0.3;

    const quote = await peechoClient.getQuote({
      offering_id: offeringId,
      page_count: params.pageCount,
      country: normalizedCountry,
      country_state_code: params.countryStateCode,
    });

    const item = quote.quotedItems[0];
    if (!item) {
      throw new Error("No quote items returned from Peecho");
    }

    // markup = (productPrice + vat) * margin  — gross wholesale × margin rate
    // Peecho quote totals are wholesale, so displayed estimates add markup here.
    const markupAmount =
      Math.round((item.productPrice + item.vat) * margin * 10000) / 10000;
    const wholesaleTotal = Math.round(item.totalItemPrice * 10000) / 10000;
    const totalEstimate =
      Math.round((wholesaleTotal + markupAmount) * 10000) / 10000;

    return {
      shippingAmount: item.shippingWholesale,
      productAmount: item.productPrice,
      baseAmount: item.productPrice,
      markupAmount,
      taxAmount: item.vat,
      totalEstimate,
      wholesaleTotal,
      marginRate: margin,
      currency: quote.quoteDetails.currency,
      offeringId,
    };
  } catch (error) {
    logger.error("Failed to get quote", error, {
      country: params.country,
      pageCount: params.pageCount,
      offeringId: params.offeringId,
    });
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to retrieve pricing quote",
    );
  }
}
