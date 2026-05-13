import { NextResponse } from "next/server";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { db } from "@/lib/db";
import { getQuote } from "@/lib/peecho/quote-service";

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
    const _firstName = nameParts[0] ?? "";
    const _lastName = nameParts.slice(1).join(" ");

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
    if (Number.isNaN(parseInt(offering.externalId, 10))) {
      return NextResponse.json(
        {
          error:
            "Offerings not synced with Peecho. Please contact support or run admin sync.",
        },
        { status: 500 },
      );
    }

    // Get a quote for the estimate pricing (order is created at cycle lock)
    const quoteData = await getQuote({
      country: address.country.toUpperCase(),
      countryStateCode: address.state?.toUpperCase() ?? undefined,
      pageCount: totalPages,
      offeringId: offering.externalId,
    });

    const wholesaleTotalAmount = quoteData.wholesaleTotal;
    const retailTotalAmount = quoteData.totalEstimate;
    const platformMarkupAmount = quoteData.markupAmount;

    // Upsert checkout intent with quote-based pricing (no Peecho order yet)
    const existingIntent = await db.checkoutIntent.findUnique({
      where: {
        collectorProfileId_cycleId: {
          collectorProfileId: collectorProfile.id,
          cycleId: currentCycle.id,
        },
      },
    });

    if (existingIntent) {
      await db.checkoutIntent.update({
        where: { id: existingIntent.id },
        data: {
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
      exactPrice: {
        amount: retailTotalAmount,
        currency: quoteData.currency,
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
