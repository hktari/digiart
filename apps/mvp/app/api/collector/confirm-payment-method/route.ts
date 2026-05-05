import { NextResponse } from "next/server";
import { commitBookletForCycle } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/billing/stripe-client";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { setupIntentId } = body as { setupIntentId: string };

  if (!setupIntentId) {
    return NextResponse.json(
      { error: "setupIntentId is required" },
      { status: 400 },
    );
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeCustomerId: true },
  });

  if (!collectorProfile?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found" },
      { status: 400 },
    );
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

  if (setupIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: "Payment method setup did not succeed" },
      { status: 400 },
    );
  }

  if (!setupIntent.payment_method) {
    return NextResponse.json(
      { error: "No payment method on setup intent" },
      { status: 400 },
    );
  }

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method.id;

  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: collectorProfile.stripeCustomerId,
  });

  await stripe.customers.update(collectorProfile.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const commitResult = await commitBookletForCycle();

  if (!commitResult.success) {
    return NextResponse.json({ error: commitResult.error }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    checkoutIntent: commitResult.checkoutIntent,
  });
}
