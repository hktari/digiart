import { NextResponse } from "next/server";
import { Errors, withErrorHandler } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/billing/stripe-client";
import { db } from "@/lib/db";

export const POST = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    throw Errors.UNAUTHORIZED();
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!collectorProfile) {
    throw Errors.NOT_FOUND("Collector profile");
  }

  let customerId = collectorProfile.stripeCustomerId;

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: collectorProfile.user.email ?? undefined,
        name:
          collectorProfile.user.name ??
          collectorProfile.displayName ??
          undefined,
        metadata: { collectorProfileId: collectorProfile.id },
      });
      customerId = customer.id;

      await db.collectorProfile.update({
        where: { id: collectorProfile.id },
        data: { stripeCustomerId: customerId },
      });
    } catch (stripeError) {
      throw Errors.EXTERNAL_API_ERROR(
        "Stripe",
        stripeError instanceof Error
          ? stripeError.message
          : "Failed to create customer",
      );
    }
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { collectorProfileId: collectorProfile.id },
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (stripeError) {
    throw Errors.EXTERNAL_API_ERROR(
      "Stripe",
      stripeError instanceof Error
        ? stripeError.message
        : "Failed to create setup intent",
    );
  }
});
