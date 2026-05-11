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

  const currentCycle = await getCurrentCycle();
  const checkoutIntent =
    summary.collectorProfileId && summary.cycleId
      ? await db.checkoutIntent.findUnique({
          where: {
            collectorProfileId_cycleId: {
              collectorProfileId: summary.collectorProfileId,
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
    quote: null,
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
