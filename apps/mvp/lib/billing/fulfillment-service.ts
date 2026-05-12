import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
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

  // Look up the checkout intent to get the Peecho order ID
  const checkoutIntent = await db.checkoutIntent.findUnique({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId: printFile.collectorProfileId,
        cycleId: printFile.cycleId,
      },
    },
  });

  if (!checkoutIntent?.peechoOrderId) {
    return { success: false, error: "No Peecho order found for this checkout" };
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

  // Get quote snapshot for reference (required for fulfillment order)
  const quoteSnapshot = await db.pricingQuoteSnapshot.findFirst({
    where: {
      collectorProfileId: printFile.collectorProfileId,
      cycleId: printFile.cycleId,
      isFrozen: true,
    },
    orderBy: { quotedAt: "desc" },
  });

  if (!quoteSnapshot) {
    return { success: false, error: "No frozen quote found" };
  }

  // Pay the existing Peecho order (already created at checkout, files attached at freeze)
  try {
    const secretKey = process.env.PEECHO_SECRET_KEY;
    if (!secretKey) {
      throw new Error("PEECHO_SECRET_KEY not configured");
    }

    const _payResponse = await peechoClient.payOrder(
      parseInt(checkoutIntent.peechoOrderId, 10),
      secretKey,
    );

    const fulfillmentOrder = existingOrder
      ? await db.fulfillmentOrder.update({
          where: { id: existingOrder.id },
          data: {
            status: "SUBMITTED",
            providerOrderId: checkoutIntent.peechoOrderId,
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
            providerOrderId: checkoutIntent.peechoOrderId,
            submittedAt: new Date(),
          },
        });

    return {
      success: true,
      fulfillmentOrderId: fulfillmentOrder.id,
      providerOrderId: checkoutIntent.peechoOrderId,
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
