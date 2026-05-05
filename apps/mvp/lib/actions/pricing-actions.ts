"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { db } from "@/lib/db";
import { peechoClient } from "@/lib/peecho/client";
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

export interface OrderPricing {
  retailTotalAmount: number;
  wholesaleTotalAmount: number;
  platformMarkupAmount: number;
  currency: string;
  pageCount: number;
  updatedAt: Date;
  peechoOrderId: string;
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
    include: { user: { select: { email: true } } },
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

  const nameParts = (collectorProfile.shippingName ?? "").trim().split(" ");

  try {
    const orderResponse = await peechoClient.createOrder({
      currency: "EUR",
      order_reference: `refresh-${collectorProfile.id}-${currentCycle.id}-${Date.now()}`,
      item_details: [
        {
          item_reference: `booklet-${collectorProfile.id}-${currentCycle.id}`,
          offering_id: parseInt(offering.externalId, 10),
          quantity: 1,
        },
      ],
      address_details: {
        email_address: collectorProfile.user.email ?? "",
        shipping_address: {
          first_name: nameParts[0] ?? "",
          last_name: nameParts.slice(1).join(" "),
          address_line_1: collectorProfile.shippingAddressLine1,
          address_line_2: collectorProfile.shippingAddressLine2 ?? undefined,
          city: collectorProfile.shippingCity,
          zip_code: collectorProfile.shippingZip,
          state: collectorProfile.shippingStateCode ?? null,
          country_code: collectorProfile.shippingCountry,
        },
      },
    });

    const orderDetails = await peechoClient.getOrderDetails(
      orderResponse.order_id,
    );

    const retailTotalAmount = orderDetails.total_retail_price_inc_taxes;
    const wholesaleTotalAmount = orderDetails.total_wholesale_price_inc_taxes;
    const platformMarkupAmount = retailTotalAmount - wholesaleTotalAmount;

    await db.checkoutIntent.update({
      where: { id: checkoutIntent.id },
      data: {
        peechoOrderId: String(orderResponse.order_id),
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
        currency: orderDetails.currency,
        pageCount: totalPages,
        updatedAt: new Date(),
        peechoOrderId: String(orderResponse.order_id),
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to refresh order",
    };
  }
}
