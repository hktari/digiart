import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/billing/stripe-client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const existingEvent = await db.stripeWebhookEvent.findUnique({
    where: { id: event.id },
  });

  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const billingRecordId = paymentIntent.metadata.billingRecordId;

        if (billingRecordId) {
          const existing = await db.billingRecord.findUnique({
            where: { id: billingRecordId },
          });

          if (existing && existing.status !== "PAID") {
            await db.billingRecord.update({
              where: { id: billingRecordId },
              data: {
                status: "PAID",
                stripePaymentIntentId: paymentIntent.id,
                paidAt: new Date(),
              },
            });
          }
        }
        break;
      }

      case "payment_intent.processing": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const billingRecordId = paymentIntent.metadata.billingRecordId;

        if (billingRecordId) {
          const existing = await db.billingRecord.findUnique({
            where: { id: billingRecordId },
          });

          if (existing && existing.status === "PENDING") {
            await db.billingRecord.update({
              where: { id: billingRecordId },
              data: {
                stripePaymentIntentId: paymentIntent.id,
              },
            });
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const billingRecordId = paymentIntent.metadata.billingRecordId;

        if (billingRecordId) {
          const existing = await db.billingRecord.findUnique({
            where: { id: billingRecordId },
          });

          if (existing && existing.status !== "PAID") {
            await db.billingRecord.update({
              where: { id: billingRecordId },
              data: {
                status: "FAILED",
                errorMessage:
                  paymentIntent.last_payment_error?.message ?? "Payment failed",
              },
            });
          }
        }
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const billingRecordId = paymentIntent.metadata.billingRecordId;

        if (billingRecordId) {
          const existing = await db.billingRecord.findUnique({
            where: { id: billingRecordId },
          });

          if (existing && existing.status !== "PAID") {
            await db.billingRecord.update({
              where: { id: billingRecordId },
              data: {
                status: "CANCELED",
                errorMessage: "Payment was canceled",
              },
            });
          }
        }
        break;
      }
    }

    await db.stripeWebhookEvent.create({
      data: { id: event.id },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook handler error", error, {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
