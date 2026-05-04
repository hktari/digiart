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

    // Markup is a fixed platform fee for UX transparency (configurable via PLATFORM_MARKUP_EUR)
    const platformMarkup = parseFloat(process.env.PLATFORM_MARKUP_EUR || "0");
    const markupAmount = platformMarkup;

    // baseAmount = productPrice - markupAmount (shows Peecho wholesale cost before platform fee)
    const baseAmount = item.productPrice - markupAmount;

    return {
      shippingAmount: item.shippingWholesale,
      productAmount: item.productPrice,
      baseAmount,
      markupAmount,
      taxAmount: item.vat,
      totalEstimate: item.totalItemPrice,
      currency: quote.quoteDetails.currency,
      offeringId,
    };
  } catch (error) {
    console.error("Failed to get quote:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to retrieve pricing quote",
    );
  }
}
