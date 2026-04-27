import { peechoClient } from "./client";

export interface QuoteParams {
  country: string;
  pageCount: number;
  offeringId?: string;
}

export interface QuoteResult {
  shippingAmount: number;
  productAmount: number;
  taxAmount: number;
  totalEstimate: number;
  currency: string;
  offeringId: string;
}

export async function getQuote(params: QuoteParams): Promise<QuoteResult> {
  try {
    let offeringId = params.offeringId;

    if (!offeringId) {
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
    }

    const quote = await peechoClient.getQuote({
      offering_id: offeringId,
      page_count: params.pageCount,
      country: params.country,
    });

    const item = quote.quotedItems[0];
    if (!item) {
      throw new Error("No quote items returned from Peecho");
    }

    return {
      shippingAmount: item.shippingWholesale,
      productAmount: item.productPrice,
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
