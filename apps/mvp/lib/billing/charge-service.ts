import Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "./stripe-client";

interface ChargeFromFrozenQuoteParams {
  collectorProfileId: string;
  cycleId: string;
  quoteSnapshotId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

type ChargeResult =
  | {
      success: true;
      billingRecordId: string;
      stripePaymentIntentId: string;
    }
  | {
      success: false;
      error: string;
      billingRecordId?: string;
      retryable?: boolean;
    };

export async function chargeCollectorFromFrozenQuote(
  params: ChargeFromFrozenQuoteParams,
): Promise<ChargeResult> {
  const collectorProfile = await db.collectorProfile.findUnique({
    where: { id: params.collectorProfileId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!collectorProfile) {
    return { success: false, error: "Collector profile not found" };
  }

  const existingBilling = await db.billingRecord.findUnique({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId: params.collectorProfileId,
        cycleId: params.cycleId,
      },
    },
  });

  if (existingBilling?.status === "PAID") {
    return {
      success: true,
      billingRecordId: existingBilling.id,
      stripePaymentIntentId: existingBilling.stripePaymentIntentId ?? "",
    };
  }

  const billingRecord = existingBilling
    ? existingBilling
    : await db.billingRecord.create({
        data: {
          collectorProfileId: params.collectorProfileId,
          cycleId: params.cycleId,
          quoteSnapshotId: params.quoteSnapshotId,
          amount: params.amount,
          currency: params.currency,
          status: "PENDING",
        },
      });

  try {
    let customerId = collectorProfile.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: collectorProfile.user.email ?? undefined,
        name:
          collectorProfile.user.name ??
          collectorProfile.displayName ??
          undefined,
        metadata: {
          collectorProfileId: params.collectorProfileId,
        },
      });
      customerId = customer.id;

      await db.collectorProfile.update({
        where: { id: params.collectorProfileId },
        data: { stripeCustomerId: customerId },
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 1,
    });

    if (paymentMethods.data.length === 0) {
      await db.billingRecord.update({
        where: { id: billingRecord.id },
        data: {
          status: "GRACE_PERIOD",
          errorMessage:
            "No saved payment method. Please add a card to complete payment.",
        },
      });

      return {
        success: false,
        error:
          "No saved payment method. Please add a card to complete payment.",
        billingRecordId: billingRecord.id,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        customer: customerId,
        off_session: true,
        confirm: true,
        payment_method: paymentMethods.data[0].id,
        metadata: {
          billingRecordId: billingRecord.id,
          collectorProfileId: params.collectorProfileId,
          cycleId: params.cycleId,
        },
      },
      {
        idempotencyKey: params.idempotencyKey,
      },
    );

    if (paymentIntent.status === "succeeded") {
      await db.billingRecord.update({
        where: { id: billingRecord.id },
        data: {
          status: "PAID",
          stripePaymentIntentId: paymentIntent.id,
          paidAt: new Date(),
        },
      });

      return {
        success: true,
        billingRecordId: billingRecord.id,
        stripePaymentIntentId: paymentIntent.id,
      };
    }

    if (paymentIntent.status === "processing") {
      await db.billingRecord.update({
        where: { id: billingRecord.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      return {
        success: false,
        error: "Payment is processing",
        billingRecordId: billingRecord.id,
        retryable: true,
      };
    }

    if (paymentIntent.status === "requires_action") {
      await db.billingRecord.update({
        where: { id: billingRecord.id },
        data: {
          status: "GRACE_PERIOD",
          stripePaymentIntentId: paymentIntent.id,
          errorMessage: "Payment requires additional authentication",
        },
      });

      return {
        success: false,
        error: "Payment requires additional authentication",
        billingRecordId: billingRecord.id,
      };
    }

    await db.billingRecord.update({
      where: { id: billingRecord.id },
      data: {
        status: "FAILED",
        stripePaymentIntentId: paymentIntent.id,
        errorMessage: `Payment failed with status: ${paymentIntent.status}`,
      },
    });

    return {
      success: false,
      error: `Payment failed with status: ${paymentIntent.status}`,
      billingRecordId: billingRecord.id,
    };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      const message =
        error.message ?? error.decline_code ?? "Card was declined";

      await db.billingRecord.update({
        where: { id: billingRecord.id },
        data: {
          status: "GRACE_PERIOD",
          errorMessage: message,
        },
      });

      return {
        success: false,
        error: message,
        billingRecordId: billingRecord.id,
      };
    }

    if (
      error instanceof Stripe.errors.StripeConnectionError ||
      error instanceof Stripe.errors.StripeRateLimitError
    ) {
      return {
        success: false,
        error: error.message,
        billingRecordId: billingRecord.id,
        retryable: true,
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown Stripe error";

    await db.billingRecord.update({
      where: { id: billingRecord.id },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });

    return {
      success: false,
      error: errorMessage,
      billingRecordId: billingRecord.id,
    };
  }
}
