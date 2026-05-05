import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { type PeechoAddressDetails, peechoClient } from "@/lib/peecho/client";

interface CommitCheckoutParams {
  checkoutIntentId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    zipCode: string;
    state?: string | null;
    countryCode: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    zipCode: string;
    state?: string | null;
    countryCode: string;
  };
}

interface CommitCheckoutResult {
  success: boolean;
  error?: string;
  finalPrice?: {
    amount: number;
    currency: string;
  };
}

/**
 * Commits a checkout by updating the Peecho order with final address details.
 * Called when collector subscribes via Stripe.
 */
export async function commitCheckout(
  params: CommitCheckoutParams,
): Promise<CommitCheckoutResult> {
  try {
    const checkoutIntent = await db.checkoutIntent.findUnique({
      where: { id: params.checkoutIntentId },
      include: {
        collectorProfile: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!checkoutIntent) {
      return { success: false, error: "Checkout intent not found" };
    }

    if (!checkoutIntent.peechoOrderId) {
      return { success: false, error: "No Peecho order found for checkout" };
    }

    // Update Peecho order address
    const addressDetails: PeechoAddressDetails = {
      email_address: checkoutIntent.collectorProfile.user.email ?? "",
      shipping_address: {
        first_name: params.shippingAddress.firstName,
        last_name: params.shippingAddress.lastName,
        address_line_1: params.shippingAddress.addressLine1,
        address_line_2: params.shippingAddress.addressLine2,
        city: params.shippingAddress.city,
        zip_code: params.shippingAddress.zipCode,
        state: params.shippingAddress.state ?? null,
        country_code: params.shippingAddress.countryCode,
      },
      billing_address: params.billingAddress
        ? {
            first_name: params.billingAddress.firstName,
            last_name: params.billingAddress.lastName,
            address_line_1: params.billingAddress.addressLine1,
            address_line_2: params.billingAddress.addressLine2,
            city: params.billingAddress.city,
            zip_code: params.billingAddress.zipCode,
            state: params.billingAddress.state ?? null,
            country_code: params.billingAddress.countryCode,
          }
        : undefined,
    };

    await peechoClient.updateOrderAddress(
      parseInt(checkoutIntent.peechoOrderId, 10),
      addressDetails,
    );

    // Fetch updated order details to confirm final price
    const orderDetails = await peechoClient.getOrderDetails(
      parseInt(checkoutIntent.peechoOrderId, 10),
    );

    // Peecho's retail price already includes their configured margin from dashboard
    // The "platform markup" is the margin Peecho charges (retail - wholesale)
    // which gets split between creators and platform via payout-service
    const wholesaleAmount = orderDetails.total_wholesale_price_inc_taxes;
    const retailAmount = orderDetails.total_retail_price_inc_taxes;
    const peechoMarginAmount = retailAmount - wholesaleAmount;

    // Update checkout intent with final pricing
    await db.checkoutIntent.update({
      where: { id: params.checkoutIntentId },
      data: {
        wholesaleTotalAmount: wholesaleAmount,
        retailTotalAmount: retailAmount,
        platformMarkupAmount: peechoMarginAmount,
      },
    });

    return {
      success: true,
      finalPrice: {
        amount: retailAmount, // Collector pays Peecho's retail price (includes margin)
        currency: orderDetails.currency,
      },
    };
  } catch (error) {
    logger.error("Failed to commit checkout", error, {
      checkoutIntentId: params.checkoutIntentId,
      stripeSubscriptionId: params.stripeSubscriptionId,
    });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to commit checkout",
    };
  }
}

/**
 * Gets the final price for a committed checkout.
 * Used to display price confirmation before cycle lock.
 */
export async function getCommittedCheckoutPrice(
  checkoutIntentId: string,
): Promise<{
  amount: number;
  currency: string;
  peechoOrderId: string;
} | null> {
  const checkoutIntent = await db.checkoutIntent.findUnique({
    where: { id: checkoutIntentId },
  });

  if (!checkoutIntent?.peechoOrderId) {
    return null;
  }

  // If we have cached retail amount from Peecho, use it directly
  // Peecho's retail price already includes their configured margin
  if (checkoutIntent.retailTotalAmount !== null) {
    return {
      amount: Number(checkoutIntent.retailTotalAmount),
      currency: "EUR",
      peechoOrderId: checkoutIntent.peechoOrderId,
    };
  }

  // Otherwise fetch fresh from Peecho
  const orderDetails = await peechoClient.getOrderDetails(
    parseInt(checkoutIntent.peechoOrderId, 10),
  );

  // Peecho's retail price already includes their configured margin from dashboard
  const finalCollectorPrice = orderDetails.total_retail_price_inc_taxes;

  return {
    amount: finalCollectorPrice,
    currency: orderDetails.currency,
    peechoOrderId: checkoutIntent.peechoOrderId,
  };
}
