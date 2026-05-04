import { stripe } from "@/lib/billing/stripe-client";
import { db } from "@/lib/db";

interface ReconciliationResult {
  reconciled: number;
  paid: number;
  failed: number;
  pending: number;
  errors: string[];
}

const CHUNK_SIZE = 20;

export async function reconcileBillingForCycle(
  cycleId: string,
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    reconciled: 0,
    paid: 0,
    failed: 0,
    pending: 0,
    errors: [],
  };

  const billingRecords = await db.billingRecord.findMany({
    where: { cycleId },
  });

  const pendingRecords = billingRecords.filter(
    (r) => r.status !== "PAID" && r.status !== "CANCELED",
  );

  result.reconciled += billingRecords.length - pendingRecords.length;
  result.paid += billingRecords.filter((r) => r.status === "PAID").length;

  const chunks: (typeof pendingRecords)[] = [];
  for (let i = 0; i < pendingRecords.length; i += CHUNK_SIZE) {
    chunks.push(pendingRecords.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const outcomes = await Promise.allSettled(
      chunk.map(async (record) => {
        if (!record.stripePaymentIntentId) {
          return { recordId: record.id, status: "pending" as const };
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(
          record.stripePaymentIntentId,
        );

        if (paymentIntent.status === "succeeded") {
          await db.billingRecord.update({
            where: { id: record.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
            },
          });
          return { recordId: record.id, status: "paid" as const };
        }

        if (
          paymentIntent.status === "requires_payment_method" ||
          paymentIntent.status === "canceled"
        ) {
          await db.billingRecord.update({
            where: { id: record.id },
            data: {
              status: "FAILED",
              errorMessage:
                paymentIntent.last_payment_error?.message ??
                `Payment ${paymentIntent.status}`,
            },
          });
          return { recordId: record.id, status: "failed" as const };
        }

        return { recordId: record.id, status: "pending" as const };
      }),
    );

    for (const outcome of outcomes) {
      if (outcome.status === "fulfilled") {
        const { status } = outcome.value;
        if (status === "paid") result.paid += 1;
        else if (status === "failed") result.failed += 1;
        else result.pending += 1;
        result.reconciled += 1;
      } else {
        const message =
          outcome.reason instanceof Error
            ? outcome.reason.message
            : "Unknown error";
        result.errors.push(`Reconciliation error: ${message}`);
      }
    }
  }

  return result;
}

export async function getFulfillmentEligibleCollectors(cycleId: string) {
  const paidRecords = await db.billingRecord.findMany({
    where: {
      cycleId,
      status: "PAID",
    },
    include: {
      collectorProfile: {
        select: {
          id: true,
          shippingCountry: true,
        },
      },
      quoteSnapshot: {
        select: {
          id: true,
          isFrozen: true,
        },
      },
    },
  });

  return paidRecords.filter(
    (r) => r.quoteSnapshot?.isFrozen && r.collectorProfile.shippingCountry,
  );
}
