import { NextResponse } from "next/server";
import { commitBookletForCycle } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";
import { freezeSingleCollectorCycle } from "@/lib/billing/freeze-service";
import { triggerPdfGenerationForCycle } from "@/lib/billing/pdf-trigger-service";
import { stripe } from "@/lib/billing/stripe-client";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collectorProfile = await db.collectorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        stripeCustomerId: true,
        shippingCountry: true,
      },
    });

    if (!collectorProfile?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No payment method on file" },
        { status: 400 },
      );
    }

    // Get current cycle
    const currentCycle = await db.subscriptionCycle.findFirst({
      where: {
        lockDate: { gt: new Date() },
        selectionOpenDate: { lte: new Date() },
      },
      orderBy: { lockDate: "asc" },
    });

    if (!currentCycle) {
      return NextResponse.json(
        { error: "No active subscription cycle" },
        { status: 400 },
      );
    }

    // Fetch existing CheckoutIntent
    const checkoutIntent = await db.checkoutIntent.findUnique({
      where: {
        collectorProfileId_cycleId: {
          collectorProfileId: collectorProfile.id,
          cycleId: currentCycle.id,
        },
      },
      select: {
        id: true,
        orderedManually: true,
        retailTotalAmount: true,
        wholesaleTotalAmount: true,
        platformMarkupAmount: true,
      },
    });

    if (!checkoutIntent?.orderedManually || !checkoutIntent.retailTotalAmount) {
      return NextResponse.json(
        { error: "No committed order to charge" },
        { status: 400 },
      );
    }

    // Get the default payment method
    const customer = await stripe.customers.retrieve(
      collectorProfile.stripeCustomerId,
    );

    if (customer.deleted) {
      return NextResponse.json(
        { error: "Customer account has been deleted" },
        { status: 400 },
      );
    }

    const defaultPaymentMethod =
      customer.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethod) {
      return NextResponse.json(
        { error: "No default payment method found" },
        { status: 400 },
      );
    }

    const amountInCents = Math.round(
      Number(checkoutIntent.retailTotalAmount) * 100,
    );

    // Create and confirm PaymentIntent immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "eur",
      customer: collectorProfile.stripeCustomerId,
      payment_method:
        typeof defaultPaymentMethod === "string"
          ? defaultPaymentMethod
          : defaultPaymentMethod.id,
      confirm: true,
      off_session: true,
      metadata: {
        collectorProfileId: collectorProfile.id,
        cycleId: currentCycle.id,
        checkoutIntentId: checkoutIntent.id,
        type: "immediate_booklet_order",
      },
    });

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment failed", status: paymentIntent.status },
        { status: 400 },
      );
    }

    // Commit the booklet
    const commitResult = await commitBookletForCycle();
    if (!commitResult.success) {
      // Refund the charge if commit failed
      await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
      });
      return NextResponse.json(
        { error: commitResult.error || "Failed to commit booklet" },
        { status: 422 },
      );
    }

    // Trigger PDF generation for this collector
    await triggerPdfGenerationForCycle(currentCycle.id);

    // Create the Peecho order immediately
    await freezeSingleCollectorCycle(collectorProfile.id, currentCycle.id);

    // Create billing record for immediate order
    // Need to get or create a quote snapshot first
    const quoteSnapshot = await db.pricingQuoteSnapshot.findFirst({
      where: {
        collectorProfileId: collectorProfile.id,
        cycleId: currentCycle.id,
      },
      orderBy: { quotedAt: "desc" },
    });

    if (quoteSnapshot) {
      await db.billingRecord.create({
        data: {
          collectorProfileId: collectorProfile.id,
          cycleId: currentCycle.id,
          quoteSnapshotId: quoteSnapshot.id,
          status: "PAID",
          amount: checkoutIntent.retailTotalAmount,
          currency: "EUR",
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntent.id,
          retailTotalAmount: checkoutIntent.retailTotalAmount,
          wholesaleTotalAmount: checkoutIntent.wholesaleTotalAmount,
          platformMarkupAmount: checkoutIntent.platformMarkupAmount,
        },
      });
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[charge-now] Error:", error);
    return NextResponse.json(
      { error: `Failed to process charge: ${message}` },
      { status: 500 },
    );
  }
}
