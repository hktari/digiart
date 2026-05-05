import { NextResponse } from "next/server";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { db } from "@/lib/db";
import { getQuote } from "@/lib/peecho/quote-service";

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

  // Pre-checkout: use quote endpoint for estimate only (no Peecho order created here)
  let pricing: {
    baseAmount: number;
    shippingAmount: number;
    markupAmount: number;
    taxAmount: number;
    totalEstimate: number;
    currency: string;
    isEstimate: true;
  } | null = null;

  if (
    collectorProfile?.shippingCountry &&
    summary.cycleId &&
    summary.totalArtworks > 0
  ) {
    try {
      const selections = await db.collectorReleaseSelection.findMany({
        where: {
          collectorProfileId: collectorProfile.id,
          cycleId: summary.cycleId,
        },
        include: {
          release: {
            include: {
              artworks: { include: { artwork: { select: { id: true } } } },
            },
          },
        },
      });

      if (selections.length > 0) {
        const { totalPages } = computeBookletPageCount(selections as any);
        const quote = await getQuote({
          country: collectorProfile.shippingCountry,
          countryStateCode: collectorProfile.shippingStateCode ?? undefined,
          pageCount: totalPages,
        });

        pricing = {
          baseAmount: quote.productAmount,
          shippingAmount: quote.shippingAmount,
          markupAmount: quote.markupAmount,
          taxAmount: quote.taxAmount,
          totalEstimate: quote.totalEstimate,
          currency: quote.currency,
          isEstimate: true,
        };
      }
    } catch {
      // Quote is best-effort — don't block cart load on Peecho errors
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
          select: {
            committedAt: true,
            acceptedEstimateDisclaimer: true,
            retailTotalAmount: true,
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
          confirmedAmount: checkoutIntent.retailTotalAmount
            ? Number(checkoutIntent.retailTotalAmount)
            : null,
        }
      : null,
    cycleLockDate: currentCycle?.lockDate ?? null,
  });
}
