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

export async function getQuote(params: QuoteParams): Promise<QuoteResult> {
  try {
    const normalizedCountry = params.country.toUpperCase();
    if (normalizedCountry === "US" && !params.countryStateCode) {
      throw new Error(
        "countryStateCode is required for US shipping quotes (e.g. CA, NY)",
      );
    }

    let offeringId: string;

    if (!params.offeringId) {
      const { db } = await import("@/lib/db");
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

    // Quotes are estimates only - final price comes from order-based pricing
    // Peecho's quote includes their configured margin in productPrice
    // The margin (productPrice - wholesale) is split between creators and platform
    const wholesalePrice = item.productPrice - item.vat; // Approximate wholesale before tax
    const marginEstimate = item.productPrice - wholesalePrice;

    return {
      shippingAmount: item.shippingWholesale,
      productAmount: item.productPrice,
      baseAmount: wholesalePrice, // Approximate wholesale cost
      markupAmount: marginEstimate, // Estimated margin (Peecho's cut)
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
