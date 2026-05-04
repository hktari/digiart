import { NextResponse } from "next/server";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getCollectorCartSummary(session.user.id);

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  let quote: {
    baseAmount: number;
    shippingAmount: number;
    markupAmount: number;
    taxAmount: number;
    totalEstimate: number;
    currency: string;
    isFrozen: boolean;
    quotedAt: Date | null;
  } | null = null;

  if (collectorProfile && summary.cycleId) {
    const latestSnapshot = await db.pricingQuoteSnapshot.findFirst({
      where: {
        collectorProfileId: collectorProfile.id,
        cycleId: summary.cycleId,
      },
      orderBy: { quotedAt: "desc" },
    });

    if (latestSnapshot) {
      quote = {
        baseAmount:
          Number(latestSnapshot.productAmount) -
          Number(latestSnapshot.markupAmount ?? 0),
        shippingAmount: Number(latestSnapshot.shippingAmount),
        markupAmount: Number(latestSnapshot.markupAmount ?? 0),
        taxAmount: Number(latestSnapshot.taxAmount),
        totalEstimate: Number(latestSnapshot.totalEstimate),
        currency: latestSnapshot.currency,
        isFrozen: latestSnapshot.isFrozen,
        quotedAt: latestSnapshot.quotedAt,
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
    quote,
    checkoutIntent: checkoutIntent
      ? {
          committedAt: checkoutIntent.committedAt,
          acceptedEstimateDisclaimer: checkoutIntent.acceptedEstimateDisclaimer,
        }
      : null,
    cycleLockDate: currentCycle?.lockDate ?? null,
  });
}
