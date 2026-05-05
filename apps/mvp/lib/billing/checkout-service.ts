import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { db } from "@/lib/db";
import { type PeechoAddressDetails, peechoClient } from "@/lib/peecho/client";

export interface CheckoutPricingResult {
  peechoOrderId: string;
  wholesaleTotalAmount: number;
  retailTotalAmount: number;
  platformMarkupAmount: number;
  finalCollectorPrice: number;
  currency: string;
}

interface CreateOrUpdateOrderParams {
  collectorProfileId: string;
  cycleId: string;
  country: string;
  countryStateCode?: string;
  pageCount: number;
}

/**
 * Creates a Peecho order (without content_url) to get accurate pricing.
 * Called when collector enters checkout/cart.
 */
export async function createCheckoutOrder(
  params: CreateOrUpdateOrderParams,
): Promise<CheckoutPricingResult> {
  const { country, countryStateCode, pageCount } = params;

  // Get default offering based on page count
  const offering = await db.podOffering.findFirst({
    where: {
      isActive: true,
      minPages: { lte: pageCount },
      maxPages: { gte: pageCount },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!offering) {
    throw new Error(`No suitable offering found for page count: ${pageCount}`);
  }

  // Get collector profile for address details (temporary placeholder address)
  const collectorProfile = await db.collectorProfile.findUnique({
    where: { id: params.collectorProfileId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!collectorProfile) {
    throw new Error("Collector profile not found");
  }

  // Create Peecho order without content_url (async file attachment)
  const orderResponse = await peechoClient.createOrder({
    currency: "EUR",
    order_reference: `checkout-${params.collectorProfileId}-${params.cycleId}-${Date.now()}`,
    item_details: [
      {
        item_reference: `booklet-${params.collectorProfileId}-${params.cycleId}`,
        offering_id: parseInt(offering.externalId, 10),
        quantity: 1,
        // No file_details - will attach later at cycle lock
      },
    ],
    address_details: {
      email_address: collectorProfile.user.email ?? "",
      shipping_address: {
        first_name: collectorProfile.user.name ?? "",
        last_name: "",
        address_line_1: collectorProfile.shippingCountry ?? country,
        zip_code: "00000",
        city: "TBD",
        state: countryStateCode ?? collectorProfile.shippingStateCode ?? null,
        country_code: country,
      },
    },
  });

  // Fetch order details to get accurate pricing
  const orderDetails = await peechoClient.getOrderDetails(
    orderResponse.order_id,
  );

  const wholesaleTotalAmount = orderDetails.total_wholesale_price_inc_taxes;
  // Peecho's retail price already includes their configured margin from dashboard
  const retailTotalAmount = orderDetails.total_retail_price_inc_taxes;
  // The "platform markup" is the margin Peecho charges (retail - wholesale)
  // which gets split between creators and platform via payout-service
  const platformMarkupAmount = retailTotalAmount - wholesaleTotalAmount;

  // Collector pays Peecho's retail price (includes their margin)
  const finalCollectorPrice = retailTotalAmount;

  // Update or create checkout intent with order details
  const existingIntent = await db.checkoutIntent.findUnique({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId: params.collectorProfileId,
        cycleId: params.cycleId,
      },
    },
  });

  if (existingIntent) {
    // Cancel old Peecho order if exists
    if (existingIntent.peechoOrderId) {
      try {
        // Note: Peecho doesn't have a cancel endpoint, we'll just orphan the old order
        // It will expire or can be cleaned up manually
      } catch {
        // Ignore errors from canceling old orders
      }
    }

    await db.checkoutIntent.update({
      where: { id: existingIntent.id },
      data: {
        peechoOrderId: String(orderResponse.order_id),
        wholesaleTotalAmount,
        retailTotalAmount,
        platformMarkupAmount,
        quoteInputCountry: country,
        quoteInputPageCount: pageCount,
      },
    });
  }

  return {
    peechoOrderId: String(orderResponse.order_id),
    wholesaleTotalAmount,
    retailTotalAmount,
    platformMarkupAmount,
    finalCollectorPrice,
    currency: orderDetails.currency,
  };
}

/**
 * Updates the checkout order when user changes selection.
 * Creates a new order with updated page count.
 */
export async function updateCheckoutOrder(
  params: CreateOrUpdateOrderParams,
): Promise<CheckoutPricingResult> {
  // For now, we create a new order with updated details
  // The old order will be orphaned (Peecho doesn't support updating page count)
  return createCheckoutOrder(params);
}

/**
 * Gets current checkout pricing for a collector/cycle.
 * Creates order if not exists, returns cached pricing if exists.
 */
export async function getOrCreateCheckoutPricing(
  collectorProfileId: string,
  cycleId: string,
): Promise<CheckoutPricingResult | null> {
  const existingIntent = await db.checkoutIntent.findUnique({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId,
        cycleId,
      },
    },
    include: {
      collectorProfile: {
        select: {
          shippingCountry: true,
          shippingStateCode: true,
        },
      },
    },
  });

  // If we have a valid order with pricing, return it
  if (
    existingIntent?.peechoOrderId &&
    existingIntent.wholesaleTotalAmount !== null &&
    existingIntent.retailTotalAmount !== null
  ) {
    // Use cached pricing - retail already includes Peecho's margin
    const wholesaleTotalAmount = Number(existingIntent.wholesaleTotalAmount);
    const retailTotalAmount = Number(existingIntent.retailTotalAmount);
    // platformMarkupAmount is the margin (retail - wholesale)
    const platformMarkupAmount = retailTotalAmount - wholesaleTotalAmount;

    return {
      peechoOrderId: existingIntent.peechoOrderId,
      wholesaleTotalAmount,
      retailTotalAmount,
      platformMarkupAmount,
      finalCollectorPrice: retailTotalAmount, // Collector pays Peecho's retail price
      currency: "EUR",
    };
  }

  // Need to create new order
  if (!existingIntent?.collectorProfile.shippingCountry) {
    return null; // Can't create order without shipping country
  }

  // Calculate current page count
  const selections = await db.collectorReleaseSelection.findMany({
    where: { collectorProfileId, cycleId },
    include: {
      release: {
        include: {
          artworks: {
            include: { artwork: { select: { id: true } } },
          },
        },
      },
    },
  });

  if (selections.length === 0) {
    return null; // No selections, can't create order
  }

  const pageCountResult = computeBookletPageCount(selections as any);

  return createCheckoutOrder({
    collectorProfileId,
    cycleId,
    country: existingIntent.collectorProfile.shippingCountry,
    countryStateCode:
      existingIntent.collectorProfile.shippingStateCode ?? undefined,
    pageCount: pageCountResult.totalPages,
  });
}

/**
 * Updates the order address when collector commits/subscribes.
 * Called during Stripe checkout completion.
 */
export async function updateOrderAddressForCommit(
  peechoOrderId: string,
  addressDetails: PeechoAddressDetails,
): Promise<{ success: boolean; message?: string }> {
  return peechoClient.updateOrderAddress(
    parseInt(peechoOrderId, 10),
    addressDetails,
  );
}

/**
 * Attaches PDF content to order at cycle lock.
 * Called after PDF generation is complete.
 */
export async function attachFilesToOrder(
  peechoOrderId: string,
  itemReference: string,
  contentUrl: string,
  pageCount: number,
): Promise<{ success: boolean }> {
  return peechoClient.attachOrderFiles(
    parseInt(peechoOrderId, 10),
    itemReference,
    {
      content_url: contentUrl,
      content_width: 210, // A4 width in mm
      content_height: 297, // A4 height in mm
      number_of_pages: pageCount,
    },
  );
}
