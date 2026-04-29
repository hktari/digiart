import type { PodOffering, PricingQuoteSnapshot } from "@prisma/client";
import { db } from "@/lib/db";

interface QuoteData {
  shippingAmount: number;
  productAmount: number;
  taxAmount: number;
  totalEstimate: number;
  currency: string;
  offeringId: string;
}

export async function createQuoteSnapshot(
  collectorId: string,
  cycleId: string,
  pageCount: number,
  quoteData: QuoteData,
): Promise<PricingQuoteSnapshot> {
  const offering = await db.podOffering.findFirst({
    where: { externalId: quoteData.offeringId },
  });

  if (!offering) {
    throw new Error("Offering not found");
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { id: collectorId },
  });

  if (!collectorProfile?.shippingCountry) {
    throw new Error("Collector shipping country not set");
  }

  const snapshot = await db.pricingQuoteSnapshot.create({
    data: {
      collectorProfileId: collectorId,
      cycleId,
      offeringId: offering.id,
      country: collectorProfile.shippingCountry,
      requestedPageCount: pageCount,
      shippingAmount: quoteData.shippingAmount,
      productAmount: quoteData.productAmount,
      taxAmount: quoteData.taxAmount,
      totalEstimate: quoteData.totalEstimate,
      currency: quoteData.currency,
    },
  });

  return snapshot;
}

export async function getLatestQuote(
  collectorId: string,
  cycleId: string,
): Promise<(PricingQuoteSnapshot & { offering: PodOffering }) | null> {
  const quote = await db.pricingQuoteSnapshot.findFirst({
    where: {
      collectorProfileId: collectorId,
      cycleId,
    },
    orderBy: { quotedAt: "desc" },
    include: {
      offering: true,
    },
  });

  return quote;
}
