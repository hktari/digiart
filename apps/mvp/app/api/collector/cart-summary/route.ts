import { NextResponse } from "next/server";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { getOrCreateCheckoutPricing } from "@/lib/billing/checkout-service";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getCollectorCartSummary(session.user.id);

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, shippingCountry: true, shippingStateCode: true },
  });

  // Use order-based pricing for accurate price (creates Peecho order if needed)
  let pricing: {
    baseAmount: number;
    shippingAmount: number;
    markupAmount: number;
    taxAmount: number;
    totalEstimate: number;
    currency: string;
    isFrozen: boolean;
    quotedAt: Date | null;
    peechoOrderId: string | null;
  } | null = null;

  if (collectorProfile && summary.cycleId && collectorProfile.shippingCountry) {
    // Get or create checkout pricing (creates Peecho order for accurate pricing)
    const checkoutPricing = await getOrCreateCheckoutPricing(
      collectorProfile.id,
      summary.cycleId,
    );

    if (checkoutPricing) {
      // Check if pricing is frozen (via quote snapshot)
      const latestSnapshot = await db.pricingQuoteSnapshot.findFirst({
        where: {
          collectorProfileId: collectorProfile.id,
          cycleId: summary.cycleId,
        },
        orderBy: { quotedAt: "desc" },
        select: { isFrozen: true, frozenAt: true },
      });

      // Also get checkout intent for order details
      const checkoutIntent = await db.checkoutIntent.findUnique({
        where: {
          collectorProfileId_cycleId: {
            collectorProfileId: collectorProfile.id,
            cycleId: summary.cycleId,
          },
        },
        select: { peechoOrderId: true, updatedAt: true },
      });

      pricing = {
        baseAmount: checkoutPricing.wholesaleTotalAmount,
        shippingAmount: 0, // Included in retail price from Peecho
        markupAmount: checkoutPricing.platformMarkupAmount,
        taxAmount: 0, // Included in retail price from Peecho
        totalEstimate: checkoutPricing.finalCollectorPrice,
        currency: checkoutPricing.currency,
        isFrozen: latestSnapshot?.isFrozen ?? false,
        quotedAt: latestSnapshot?.frozenAt ?? checkoutIntent?.updatedAt ?? null,
        peechoOrderId: checkoutIntent?.peechoOrderId ?? null,
      };
    }
  }

  const currentCycle = await getCurrentCycle();
  const checkoutIntent =
    collectorProfile && summary.cycleId
      ? await db.checkoutIntent.findUnique({
          where: {
            collectorProfileId_cycleId: {
              collectorProfileId: collectorProfile.id,
              cycleId: summary.cycleId,
            },
          },
        })
      : null;

  return NextResponse.json({
    ...summary,
    quote: pricing,
    checkoutIntent: checkoutIntent
      ? {
          committedAt: checkoutIntent.committedAt,
          acceptedEstimateDisclaimer: checkoutIntent.acceptedEstimateDisclaimer,
        }
      : null,
    cycleLockDate: currentCycle?.lockDate ?? null,
  });
}
