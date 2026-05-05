import { db } from "@/lib/db";

interface EarningsCalculation {
  creatorId: string;
  amount: number;
  currency: string;
}

/**
 * Calculate creator earnings based on the margin (retail - wholesale)
 * from order-based pricing, split according to PlatformConfig.
 */
export async function calculateCreatorEarningsForCycle(
  cycleId: string,
): Promise<{
  payouts: EarningsCalculation[];
  totalMarginPool: number;
  totalCreatorPayout: number;
  totalPlatformFee: number;
  paidCollectors: number;
  fulfilledCollectors: number;
}> {
  // Get platform config for payout split
  const platformConfig = await db.platformConfig.findFirst();
  const creatorPayoutSplit = platformConfig?.creatorPayoutSplit ?? 0.7;
  const platformFeeSplit = platformConfig?.platformFeeSplit ?? 0.3;

  // Get paid billing records with order-based pricing data
  const paidBillingRecords = await db.billingRecord.findMany({
    where: {
      cycleId,
      status: "PAID",
    },
    select: {
      id: true,
      collectorProfileId: true,
      retailTotalAmount: true,
      wholesaleTotalAmount: true,
      platformMarkupAmount: true,
      creatorPayoutAmount: true,
      currency: true,
      quoteSnapshot: {
        select: {
          id: true,
          markupAmount: true,
          currency: true,
          isFrozen: true,
        },
      },
    },
  });

  const fulfilledOrders = await db.fulfillmentOrder.findMany({
    where: {
      cycleId,
      status: { in: ["SUBMITTED", "PROCESSING", "SHIPPED", "DELIVERED"] },
    },
    select: { collectorProfileId: true },
  });

  const fulfilledCollectorIds = new Set(
    fulfilledOrders.map((o) => o.collectorProfileId),
  );

  const eligibleRecords = paidBillingRecords.filter((r) =>
    fulfilledCollectorIds.has(r.collectorProfileId),
  );

  // Calculate total margin from order-based pricing (retail - wholesale)
  // or fall back to the old quote-based markup if order pricing not available
  const totalMarginPool = eligibleRecords.reduce((sum, r) => {
    if (r.retailTotalAmount && r.wholesaleTotalAmount) {
      return sum + Number(r.retailTotalAmount) - Number(r.wholesaleTotalAmount);
    }
    // Fallback to old quote-based markup
    return sum + Number(r.quoteSnapshot?.markupAmount ?? 0);
  }, 0);

  // Calculate creator and platform shares
  const totalCreatorPayout = totalMarginPool * creatorPayoutSplit;
  const totalPlatformFee = totalMarginPool * platformFeeSplit;

  const currency = eligibleRecords[0]?.currency ?? "EUR";

  const selections = await db.collectorReleaseSelection.findMany({
    where: {
      cycleId,
      collectorProfileId: {
        in: eligibleRecords.map((r) => r.collectorProfileId),
      },
    },
    include: {
      release: {
        select: {
          creatorProfileId: true,
          _count: { select: { artworks: true } },
        },
      },
    },
  });

  const creatorArtworkCounts = new Map<string, number>();
  let totalArtworks = 0;

  for (const selection of selections) {
    const creatorId = selection.release.creatorProfileId;
    const count = selection.release._count.artworks;
    creatorArtworkCounts.set(
      creatorId,
      (creatorArtworkCounts.get(creatorId) ?? 0) + count,
    );
    totalArtworks += count;
  }

  const payouts: EarningsCalculation[] = [];

  for (const [creatorId, artworkCount] of creatorArtworkCounts) {
    if (totalArtworks === 0) continue;
    const share = artworkCount / totalArtworks;
    // Creator's share of the total margin pool
    const amount = Math.round(totalCreatorPayout * share * 100) / 100;

    payouts.push({
      creatorId,
      amount,
      currency,
    });
  }

  const existingCalc = await db.payoutCalculation.findUnique({
    where: { cycleId },
  });

  if (!existingCalc) {
    await db.payoutCalculation.create({
      data: {
        cycleId,
        totalMarkupPool: totalCreatorPayout, // Store creator payout pool for backwards compatibility
        totalPaidCollectors: paidBillingRecords.length,
        totalFulfilledCollectors: fulfilledCollectorIds.size,
        calculationSnapshot: {
          payouts,
          totalMarginPool,
          totalCreatorPayout,
          totalPlatformFee,
          creatorPayoutSplit,
          platformFeeSplit,
        } as any,
      },
    });
  }

  for (const payout of payouts) {
    await db.creatorPayout.upsert({
      where: {
        creatorProfileId_cycleId: {
          creatorProfileId: payout.creatorId,
          cycleId,
        },
      },
      create: {
        creatorProfileId: payout.creatorId,
        cycleId,
        amount: payout.amount,
        currency: payout.currency,
        status: "PENDING",
      },
      update: {
        amount: payout.amount,
        currency: payout.currency,
        calculatedAt: new Date(),
      },
    });
  }

  return {
    payouts,
    totalMarginPool,
    totalCreatorPayout,
    totalPlatformFee,
    paidCollectors: paidBillingRecords.length,
    fulfilledCollectors: fulfilledCollectorIds.size,
  };
}
