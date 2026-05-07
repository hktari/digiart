import { NextResponse } from "next/server";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { db } from "@/lib/db";
import { peechoClient } from "@/lib/peecho/client";

interface CreateOrderBody {
  address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateOrderBody;
    const { address } = body;

    if (
      !address?.line1 ||
      !address?.city ||
      !address?.postal_code ||
      !address?.country
    ) {
      return NextResponse.json(
        { error: "Incomplete address" },
        { status: 400 },
      );
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

    const currentCycle = await getCurrentCycle();
    if (!currentCycle) {
      return NextResponse.json({ error: "No active cycle" }, { status: 400 });
    }

    // Save full address to CollectorProfile
    // Note: Stripe AddressElement doesn't return name, use profile displayName or user name
    const displayName =
      collectorProfile.user.name ?? collectorProfile.displayName ?? "Collector";
    const nameParts = displayName.trim().split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

    await db.collectorProfile.update({
      where: { id: collectorProfile.id },
      data: {
        shippingName: address.name,
        shippingAddressLine1: address.line1,
        shippingAddressLine2: address.line2 ?? null,
        shippingCity: address.city,
        shippingZip: address.postal_code,
        shippingCountry: address.country.toUpperCase(),
        shippingStateCode: address.state?.toUpperCase() ?? null,
      },
    });

    // Get current selections + page count
    const selections = await db.collectorReleaseSelection.findMany({
      where: {
        collectorProfileId: collectorProfile.id,
        cycleId: currentCycle.id,
      },
      include: {
        release: {
          include: {
            artworks: { include: { artwork: { select: { id: true } } } },
          },
        },
      },
    });

    if (selections.length === 0) {
      return NextResponse.json(
        { error: "No releases selected" },
        { status: 400 },
      );
    }

    const { totalPages } = computeBookletPageCount(selections as any);

    const offering = await db.podOffering.findFirst({
      where: {
        isActive: true,
        minPages: { lte: totalPages },
        maxPages: { gte: totalPages },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!offering) {
      return NextResponse.json(
        { error: `No offering found for ${totalPages} pages` },
        { status: 400 },
      );
    }

    // Validate offering has a valid Peecho externalId
    const offeringId = parseInt(offering.externalId, 10);
    if (Number.isNaN(offeringId) || offeringId === 0) {
      return NextResponse.json(
        {
          error:
            "Offerings not synced with Peecho. Please contact support or run admin sync.",
        },
        { status: 500 },
      );
    }

    // Check for existing order to orphan it
    const existingIntent = await db.checkoutIntent.findUnique({
      where: {
        collectorProfileId_cycleId: {
          collectorProfileId: collectorProfile.id,
          cycleId: currentCycle.id,
        },
      },
    });

    // Create Peecho order with real address
    const orderResponse = await peechoClient.createOrder({
      currency: "EUR",
      order_reference: `checkout-${collectorProfile.id}-${currentCycle.id}-${Date.now()}`,
      item_details: [
        {
          item_reference: `booklet-${collectorProfile.id}-${currentCycle.id}`,
          offering_id: offeringId,
          quantity: 1,
        },
      ],
      address_details: {
        email_address: collectorProfile.user.email ?? "",
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address_line_1: address.line1,
          address_line_2: address.line2,
          city: address.city,
          zip_code: address.postal_code,
          state: address.state ?? null,
          country_code: address.country.toUpperCase(),
        },
      },
    });

    // Fetch order details to get exact retail price
    const orderDetails = await peechoClient.getOrderDetails(
      orderResponse.order_id,
    );

    const wholesaleTotalAmount = orderDetails.total_wholesale_price_inc_taxes;
    const retailTotalAmount = orderDetails.total_retail_price_inc_taxes;
    const platformMarkupAmount = retailTotalAmount - wholesaleTotalAmount;

    // Upsert checkout intent with exact pricing
    if (existingIntent) {
      await db.checkoutIntent.update({
        where: { id: existingIntent.id },
        data: {
          peechoOrderId: String(orderResponse.order_id),
          wholesaleTotalAmount,
          retailTotalAmount,
          platformMarkupAmount,
          quoteInputCountry: address.country.toUpperCase(),
          quoteInputPageCount: totalPages,
          selectionSnapshot: selections.map((s) => ({
            releaseId: s.releaseId,
          })),
        },
      });
    } else {
      await db.checkoutIntent.create({
        data: {
          collectorProfileId: collectorProfile.id,
          cycleId: currentCycle.id,
          peechoOrderId: String(orderResponse.order_id),
          wholesaleTotalAmount,
          retailTotalAmount,
          platformMarkupAmount,
          quoteInputCountry: address.country.toUpperCase(),
          quoteInputPageCount: totalPages,
          acceptedEstimateDisclaimer: true,
          selectionSnapshot: selections.map((s) => ({
            releaseId: s.releaseId,
          })),
        },
      });
    }

    return NextResponse.json({
      peechoOrderId: String(orderResponse.order_id),
      exactPrice: {
        amount: retailTotalAmount,
        currency: orderDetails.currency,
      },
      pageCount: totalPages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[create-order] Error:", error);
    return NextResponse.json(
      { error: `Failed to create order: ${message}` },
      { status: 500 },
    );
  }
}
