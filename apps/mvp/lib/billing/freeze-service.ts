import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { peechoClient } from "@/lib/peecho/client";
import { getQuote } from "@/lib/peecho/quote-service";
import { createQuoteSnapshot } from "@/lib/pricing/quote-snapshot";
import { extractKeyFromStorageUrl, getPresignedGetUrl } from "@/lib/s3";

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

    // Skip collectors who already ordered manually — they are already fulfilled
    if (intent.orderedManually) {
      result.ineligible += 1;
      continue;
    }

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

      // Create the Peecho order at cycle lock with the final PDF URL.
      // Order is not created during checkout; it is created here when the
      // cycle freezes and the generated print file is ready.
      try {
        const printFile = await db.generatedPrintFile.findUnique({
          where: {
            collectorProfileId_cycleId: {
              collectorProfileId: collectorId,
              cycleId,
            },
          },
        });

        if (printFile?.storageUrl && printFile.status === "READY") {
          // Generate a presigned URL valid for 14 days for Peecho to download
          const key = extractKeyFromStorageUrl(printFile.storageUrl);
          if (!key) {
            throw new Error(
              `Failed to extract S3 key from URL: ${printFile.storageUrl}`,
            );
          }
          const presignedUrl = await getPresignedGetUrl(key);

          // Fetch full collector profile for address details
          const collectorProfile = await db.collectorProfile.findUnique({
            where: { id: collectorId },
            include: { user: { select: { email: true, name: true } } },
          });

          if (!collectorProfile) {
            throw new Error("Collector profile not found");
          }

          // Find the matching offering for the final page count
          const offering = await db.podOffering.findFirst({
            where: {
              isActive: true,
              minPages: { lte: pageCountResult.totalPages },
              maxPages: { gte: pageCountResult.totalPages },
            },
            orderBy: { createdAt: "asc" },
          });

          if (!offering) {
            throw new Error(
              `No offering found for ${pageCountResult.totalPages} pages`,
            );
          }

          const displayName =
            collectorProfile.user.name ??
            collectorProfile.displayName ??
            "Collector";
          const nameParts = displayName.trim().split(" ");
          const firstName = nameParts[0] ?? "";
          const lastName = nameParts.slice(1).join(" ");

          const offeringId = parseInt(offering.externalId, 10);
          if (Number.isNaN(offeringId) || offeringId === 0) {
            throw new Error(
              "Offering not synced with Peecho. Please run admin sync.",
            );
          }

          // Create the Peecho order with the actual PDF URL
          const orderResponse = await peechoClient.createOrder({
            currency: "EUR",
            order_reference: `freeze-${collectorId}-${cycleId}-${Date.now()}`,
            item_details: [
              {
                item_reference: `booklet-${collectorId}-${cycleId}`,
                offering_id: offeringId,
                quantity: 1,
                file_details: {
                  content_url: presignedUrl,
                  content_width: printFile.widthMm ?? 148,
                  content_height: printFile.heightMm ?? 210,
                  number_of_pages:
                    printFile.pageCount ?? pageCountResult.totalPages,
                },
              },
            ],
            address_details: {
              email_address: collectorProfile.user.email ?? "",
              shipping_address: {
                first_name: firstName,
                last_name: lastName,
                address_line_1: collectorProfile.shippingAddressLine1 ?? "",
                address_line_2:
                  collectorProfile.shippingAddressLine2 ?? undefined,
                city: collectorProfile.shippingCity ?? "",
                zip_code: collectorProfile.shippingZip ?? "",
                state: collectorProfile.shippingStateCode ?? null,
                country_code: collectorProfile.shippingCountry ?? "",
              },
            },
          });

          // Fetch final order details to confirm price
          const orderDetails = await peechoClient.getOrderDetails(
            orderResponse.order_id,
          );

          // Update checkout intent with peechoOrderId and final pricing
          await db.checkoutIntent.update({
            where: { id: intent.id },
            data: {
              peechoOrderId: String(orderResponse.order_id),
              wholesaleTotalAmount:
                orderDetails.total_wholesale_price_inc_taxes,
              retailTotalAmount: orderDetails.total_retail_price_inc_taxes,
              platformMarkupAmount:
                orderDetails.total_retail_price_inc_taxes -
                orderDetails.total_wholesale_price_inc_taxes,
            },
          });

          // Notify passive collector that their booklet has been ordered
          const collectorUser = await db.user.findFirst({
            where: { collectorProfile: { id: collectorId } },
            select: { id: true },
          });
          if (collectorUser) {
            await db.emailNotificationLog.create({
              data: {
                userId: collectorUser.id,
                type: "COLLECTOR_ORDER_CONFIRMED",
                cycleId,
                status: "PENDING",
              },
            });
          }
        }
      } catch (error) {
        logger.warn(
          "Failed to create Peecho order during freeze (will retry at fulfillment)",
          {
            collectorId,
            cycleId,
            error: String(error),
          },
        );
        // Don't fail the freeze process if order creation fails
        // The fulfillment service will retry later
      }

      result.frozen += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Collector ${collectorId}: ${message}`);
    }
  }

  return result;
}
