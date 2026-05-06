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
// we must manually add `PlatformConfig.quoteMarginAmount` on top of the
// wholesale product price returned by the quote API. This value must be kept
// in sync with the margin configured in the Peecho merchant dashboard.
//
// References:
//   - Peecho /v1/print/order/quote  → wholesale, no markup
//   - Peecho /v1/print/order/create → retail, markup included

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

    // Read platform margin to add on top of Peecho wholesale quote price.
    // Falls back to 5.0 if no PlatformConfig row exists yet.
    const platformConfig = await db.platformConfig.findFirst();
    const marginAmount = platformConfig?.quoteMarginAmount ?? 5.0;

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

    // baseAmount = wholesale cost before margin (productPrice is wholesale-only from Peecho)
    const baseAmount = item.productPrice - marginAmount;

    return {
      shippingAmount: item.shippingWholesale,
      productAmount: item.productPrice,
      baseAmount,
      markupAmount: marginAmount,
      taxAmount: item.vat,
      totalEstimate: item.totalItemPrice,
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
