"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
    return {
      error: error instanceof Error ? error.message : "Failed to fetch quote",
    };
  }
}
