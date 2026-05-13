"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { db } from "@/lib/db";
import { getQuote } from "@/lib/peecho/quote-service";
import { createQuoteSnapshot } from "@/lib/pricing/quote-snapshot";

export async function fetchAndPersistQuote(pageCount: number = 20) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!collectorProfile) {
    return { error: "Collector profile not found" };
  }

  if (!collectorProfile.shippingCountry) {
    return {
      error: "Please set your shipping country in profile settings first",
    };
  }

  const currentCycle = await getCurrentCycle();
  if (!currentCycle) {
    return { error: "No active subscription cycle" };
  }

  try {
    const quoteData = await getQuote({
      country: collectorProfile.shippingCountry,
      countryStateCode: collectorProfile.shippingStateCode ?? undefined,
      pageCount,
    });

    const snapshot = await createQuoteSnapshot(
      collectorProfile.id,
      currentCycle.id,
      pageCount,
      quoteData,
    );

    return {
      success: true,
      quote: {
        shippingAmount: Number(snapshot.shippingAmount),
        productAmount: Number(snapshot.productAmount),
        taxAmount: Number(snapshot.taxAmount),
        totalEstimate: Number(snapshot.totalEstimate),
        currency: snapshot.currency,
        quotedAt: snapshot.quotedAt,
      },
    };
  } catch (error) {
    if (
      collectorProfile.shippingCountry.toUpperCase() === "US" &&
      error instanceof Error &&
      error.message.includes("countryStateCode is required")
    ) {
      return {
        error:
          "US quotes require a shipping state code. Please contact support to complete US quote configuration.",
      };
    }

    return {
      error: error instanceof Error ? error.message : "Failed to fetch quote",
    };
  }
}

export async function fetchLiveQuote(
  country: string,
  countryStateCode?: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!collectorProfile) {
    return { error: "Collector profile not found" };
  }

  const currentCycle = await getCurrentCycle();
  if (!currentCycle) {
    return { error: "No active subscription cycle" };
  }

  const selections = await db.collectorReleaseSelection.findMany({
    where: {
      collectorProfileId: collectorProfile.id,
      cycleId: currentCycle.id,
    },
    include: {
      release: {
        include: {
          artworks: { include: { artwork: { select: { id: true } } } },
        },
      },
    },
  });

  if (selections.length === 0) {
    return { error: "No releases selected" };
  }

  const { totalPages } = computeBookletPageCount(selections as any);

  try {
    const quoteData = await getQuote({
      country,
      countryStateCode: countryStateCode || undefined,
      pageCount: totalPages,
    });

    return {
      success: true,
      quote: {
        baseAmount: quoteData.baseAmount,
        shippingAmount: quoteData.shippingAmount,
        markupAmount: quoteData.markupAmount,
        taxAmount: quoteData.taxAmount,
        totalEstimate: quoteData.totalEstimate,
        currency: quoteData.currency,
        pageCount: totalPages,
      },
    };
  } catch (error) {
    if (
      country.toUpperCase() === "US" &&
      error instanceof Error &&
      error.message.includes("countryStateCode is required")
    ) {
      return {
        error:
          "US quotes require a shipping state code. Please select a state.",
      };
    }

    return {
      error: error instanceof Error ? error.message : "Failed to fetch quote",
    };
  }
}

export interface OrderPricing {
  retailTotalAmount: number;
  wholesaleTotalAmount: number;
  platformMarkupAmount: number;
  currency: string;
  pageCount: number;
  updatedAt: Date;
  peechoOrderId?: string;
}

export async function refreshCommittedOrder(): Promise<
  { success: true; pricing: OrderPricing } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!collectorProfile) {
    return { error: "Collector profile not found" };
  }

  if (
    !collectorProfile.shippingCountry ||
    !collectorProfile.shippingAddressLine1 ||
    !collectorProfile.shippingCity ||
    !collectorProfile.shippingZip
  ) {
    return {
      error:
        "Complete delivery address required. Please go through checkout first.",
    };
  }

  const currentCycle = await getCurrentCycle();
  if (!currentCycle) {
    return { error: "No active subscription cycle" };
  }

  const checkoutIntent = await db.checkoutIntent.findUnique({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId: collectorProfile.id,
        cycleId: currentCycle.id,
      },
    },
  });

  if (!checkoutIntent) {
    return {
      error: "No committed order found. Please complete checkout first.",
    };
  }

  // Get current selections
  const selections = await db.collectorReleaseSelection.findMany({
    where: {
      collectorProfileId: collectorProfile.id,
      cycleId: currentCycle.id,
    },
    include: {
      release: {
        include: {
          artworks: { include: { artwork: { select: { id: true } } } },
        },
      },
    },
  });

  if (selections.length === 0) {
    return { error: "No releases selected" };
  }

  const { totalPages } = computeBookletPageCount(selections as any);

  const offering = await db.podOffering.findFirst({
    where: {
      isActive: true,
      minPages: { lte: totalPages },
      maxPages: { gte: totalPages },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!offering) {
    return { error: `No offering available for ${totalPages} pages` };
  }

  try {
    const quoteData = await getQuote({
      country: collectorProfile.shippingCountry,
      countryStateCode: collectorProfile.shippingStateCode ?? undefined,
      pageCount: totalPages,
      offeringId: offering.externalId,
    });

    const retailTotalAmount = quoteData.totalEstimate;
    const wholesaleTotalAmount = quoteData.wholesaleTotal;
    const platformMarkupAmount = quoteData.markupAmount;

    await db.checkoutIntent.update({
      where: { id: checkoutIntent.id },
      data: {
        retailTotalAmount,
        wholesaleTotalAmount,
        platformMarkupAmount,
        quoteInputPageCount: totalPages,
        quoteInputCountry: collectorProfile.shippingCountry,
        selectionSnapshot: selections.map((s) => ({ releaseId: s.releaseId })),
      },
    });

    return {
      success: true,
      pricing: {
        retailTotalAmount,
        wholesaleTotalAmount,
        platformMarkupAmount,
        currency: quoteData.currency,
        pageCount: totalPages,
        updatedAt: new Date(),
        peechoOrderId: checkoutIntent.peechoOrderId ?? undefined,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to refresh quote",
    };
  }
}
