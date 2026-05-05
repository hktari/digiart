import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { peechoClient } from "@/lib/peecho/client";
import { getQuote } from "@/lib/peecho/quote-service";
import { createQuoteSnapshot } from "@/lib/pricing/quote-snapshot";
import { attachFilesToOrder } from "./checkout-service";

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

      // Get quote for quote snapshot (used for historical reference)
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

      // If we have an existing Peecho order, update it with final page count
      // by attaching the file (which includes page count in metadata)
      if (intent.peechoOrderId) {
        try {
          // Get or create the generated print file
          const printFile = await db.generatedPrintFile.findUnique({
            where: {
              collectorProfileId_cycleId: {
                collectorProfileId: collectorId,
                cycleId,
              },
            },
          });

          if (printFile?.storageUrl && printFile.status === "READY") {
            // Attach the PDF to the existing order
            await attachFilesToOrder(
              intent.peechoOrderId,
              `booklet-${collectorId}-${cycleId}`,
              printFile.storageUrl,
              printFile.pageCount ?? pageCountResult.totalPages,
            );

            // Fetch final order details to confirm price
            const orderDetails = await peechoClient.getOrderDetails(
              parseInt(intent.peechoOrderId, 10),
            );

            // Update checkout intent with final pricing
            await db.checkoutIntent.update({
              where: { id: intent.id },
              data: {
                wholesaleTotalAmount:
                  orderDetails.total_wholesale_price_inc_taxes,
                retailTotalAmount: orderDetails.total_retail_price_inc_taxes,
              },
            });
          }
        } catch (error) {
          logger.warn(
            "Failed to attach files to order during freeze (will retry at fulfillment)",
            {
              collectorId,
              cycleId,
              peechoOrderId: intent.peechoOrderId,
              error: String(error),
            },
          );
          // Don't fail the freeze process if file attachment fails
          // The fulfillment service will retry later
        }
      }

      result.frozen += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Collector ${collectorId}: ${message}`);
    }
  }

  return result;
}
