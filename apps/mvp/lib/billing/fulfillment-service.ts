import { db } from "@/lib/db";
import { peechoClient } from "@/lib/peecho/client";

type SubmitOrderResult =
  | {
      success: true;
      fulfillmentOrderId: string;
      providerOrderId: string;
    }
  | {
      success: false;
      error: string;
    };

export async function submitFulfillmentOrder(
  generatedPrintFileId: string,
): Promise<SubmitOrderResult> {
  const printFile = await db.generatedPrintFile.findUnique({
    where: { id: generatedPrintFileId },
    include: {
      collectorProfile: {
        select: {
          id: true,
          displayName: true,
          shippingCountry: true,
          shippingStateCode: true,
          user: {
            select: { email: true, name: true },
          },
        },
      },
    },
  });

  if (!printFile) {
    return { success: false, error: "Print file not found" };
  }

  if (printFile.status !== "READY") {
    return { success: false, error: "Print file is not ready" };
  }

  if (!printFile.storageUrl) {
    return { success: false, error: "Print file has no storage URL" };
  }

  const quoteSnapshot = await db.pricingQuoteSnapshot.findFirst({
    where: {
      collectorProfileId: printFile.collectorProfileId,
      cycleId: printFile.cycleId,
      isFrozen: true,
    },
    orderBy: { quotedAt: "desc" },
    include: { offering: true },
  });

  if (!quoteSnapshot) {
    return { success: false, error: "No frozen quote found" };
  }

  const existingOrder = await db.fulfillmentOrder.findUnique({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId: printFile.collectorProfileId,
        cycleId: printFile.cycleId,
      },
    },
  });

  if (
    existingOrder?.status === "SUBMITTED" ||
    existingOrder?.status === "PROCESSING" ||
    existingOrder?.status === "SHIPPED" ||
    existingOrder?.status === "DELIVERED"
  ) {
    return {
      success: true,
      fulfillmentOrderId: existingOrder.id,
      providerOrderId: existingOrder.providerOrderId ?? "",
    };
  }

  try {
    const orderResponse = await peechoClient.createOrder({
      currency: quoteSnapshot.currency,
      order_reference: `mvp-${printFile.collectorProfileId}-${printFile.cycleId}`,
      item_details: [
        {
          item_reference: `booklet-${printFile.id}`,
          offering_id: parseInt(quoteSnapshot.offering.externalId, 10),
          quantity: 1,
          file_details: {
            content_url: printFile.storageUrl,
            content_width: 210,
            content_height: 297,
            number_of_pages: printFile.pageCount ?? 20,
          },
        },
      ],
      address_details: {
        email_address: printFile.collectorProfile.user.email ?? "",
        shipping_address: {
          first_name:
            printFile.collectorProfile.user.name ??
            printFile.collectorProfile.displayName ??
            "",
          last_name: "",
          address_line_1: printFile.collectorProfile.shippingCountry ?? "",
          zip_code: "00000",
          city: "Unknown",
          state: printFile.collectorProfile.shippingStateCode ?? null,
          country_code: printFile.collectorProfile.shippingCountry ?? "",
        },
      },
    });

    const fulfillmentOrder = existingOrder
      ? await db.fulfillmentOrder.update({
          where: { id: existingOrder.id },
          data: {
            status: "SUBMITTED",
            providerOrderId: String(orderResponse.order_id),
            submittedAt: new Date(),
            errorMessage: null,
          },
        })
      : await db.fulfillmentOrder.create({
          data: {
            collectorProfileId: printFile.collectorProfileId,
            cycleId: printFile.cycleId,
            generatedPrintFileId: printFile.id,
            quoteSnapshotId: quoteSnapshot.id,
            status: "SUBMITTED",
            providerOrderId: String(orderResponse.order_id),
            submittedAt: new Date(),
          },
        });

    return {
      success: true,
      fulfillmentOrderId: fulfillmentOrder.id,
      providerOrderId: fulfillmentOrder.providerOrderId ?? "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (existingOrder) {
      await db.fulfillmentOrder.update({
        where: { id: existingOrder.id },
        data: {
          status: "FAILED",
          errorMessage: message,
        },
      });
    } else {
      await db.fulfillmentOrder.create({
        data: {
          collectorProfileId: printFile.collectorProfileId,
          cycleId: printFile.cycleId,
          generatedPrintFileId: printFile.id,
          quoteSnapshotId: quoteSnapshot.id,
          status: "FAILED",
          errorMessage: message,
        },
      });
    }

    return { success: false, error: message };
  }
}
