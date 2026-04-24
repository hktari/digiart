import { peechoClient } from "./client";

interface QuoteParams {
  country: string;
  pageCount: number;
  offeringId?: string;
}

interface QuoteResult {
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

    return {
      shippingAmount: quote.shipping_amount,
      productAmount: quote.product_amount,
      taxAmount: quote.tax_amount,
      totalEstimate: quote.total_amount,
      currency: quote.currency,
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
