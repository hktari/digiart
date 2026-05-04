import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { db } from "@/lib/db";
import { getQuote } from "@/lib/peecho/quote-service";
import { createQuoteSnapshot } from "@/lib/pricing/quote-snapshot";

interface FreezeResult {
  frozen: number;
  ineligible: number;
  errors: string[];
}

export async function freezeCollectorCycleQuotes(
  cycleId: string,
): Promise<FreezeResult> {
  const result: FreezeResult = { frozen: 0, ineligible: 0, errors: [] };

  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    result.errors.push(`Cycle ${cycleId} not found`);
    return result;
  }

  const checkoutIntents = await db.checkoutIntent.findMany({
    where: { cycleId },
    include: {
      collectorProfile: {
        select: {
          id: true,
          shippingCountry: true,
          shippingStateCode: true,
        },
      },
    },
  });

  for (const intent of checkoutIntents) {
    const collectorId = intent.collectorProfileId;

    try {
      if (!intent.collectorProfile.shippingCountry) {
        result.ineligible += 1;
        continue;
      }

      const selections = await db.collectorReleaseSelection.findMany({
        where: {
          collectorProfileId: collectorId,
          cycleId,
        },
        include: {
          release: {
            include: {
              artworks: {
                include: {
                  artwork: { select: { id: true } },
                },
              },
            },
          },
        },
      });

      if (selections.length === 0) {
        result.ineligible += 1;
        continue;
      }

      const pageCountResult = computeBookletPageCount(selections as any);

      const quoteData = await getQuote({
        country: intent.collectorProfile.shippingCountry,
        countryStateCode:
          intent.collectorProfile.shippingStateCode ?? undefined,
        pageCount: pageCountResult.totalPages,
      });

      const snapshot = await createQuoteSnapshot(
        collectorId,
        cycleId,
        pageCountResult.totalPages,
        quoteData,
      );

      await db.pricingQuoteSnapshot.update({
        where: { id: snapshot.id },
        data: {
          isFrozen: true,
          frozenAt: new Date(),
        },
      });

      result.frozen += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Collector ${collectorId}: ${message}`);
    }
  }

  return result;
}
