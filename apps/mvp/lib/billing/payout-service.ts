import { db } from "@/lib/db";

interface EarningsCalculation {
  creatorId: string;
  amount: number;
  currency: string;
}

export async function calculateCreatorEarningsForCycle(
  cycleId: string,
): Promise<{
  payouts: EarningsCalculation[];
  totalMarkupPool: number;
  paidCollectors: number;
  fulfilledCollectors: number;
}> {
  const paidBillingRecords = await db.billingRecord.findMany({
    where: {
      cycleId,
      status: "PAID",
    },
    include: {
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

  const eligibleRecords = paidBillingRecords.filter(
    (r) =>
      r.quoteSnapshot?.isFrozen &&
      fulfilledCollectorIds.has(r.collectorProfileId),
  );

  const totalMarkupPool = eligibleRecords.reduce((sum, r) => {
    return sum + Number(r.quoteSnapshot?.markupAmount ?? 0);
  }, 0);

  const currency = eligibleRecords[0]?.quoteSnapshot?.currency ?? "EUR";

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
    const amount = Math.round(totalMarkupPool * share * 100) / 100;

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
        totalMarkupPool,
        totalPaidCollectors: paidBillingRecords.length,
        totalFulfilledCollectors: fulfilledCollectorIds.size,
        calculationSnapshot: payouts as any,
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
    totalMarkupPool,
    paidCollectors: paidBillingRecords.length,
    fulfilledCollectors: fulfilledCollectorIds.size,
  };
}
