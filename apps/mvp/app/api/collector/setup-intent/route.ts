import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/billing/stripe-client";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!collectorProfile) {
    return NextResponse.json(
      { error: "Collector profile not found" },
      { status: 404 },
    );
  }

  let customerId = collectorProfile.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: collectorProfile.user.email ?? undefined,
      name:
        collectorProfile.user.name ?? collectorProfile.displayName ?? undefined,
      metadata: { collectorProfileId: collectorProfile.id },
    });
    customerId = customer.id;

    await db.collectorProfile.update({
      where: { id: collectorProfile.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: { collectorProfileId: collectorProfile.id },
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
