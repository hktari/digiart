import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutPaymentForm } from "@/components/checkout-payment-form";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";
import { getOrCreateCheckoutPricing } from "@/lib/billing/checkout-service";
import { stripe } from "@/lib/billing/stripe-client";
import { db } from "@/lib/db";

export default async function CollectorCheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const summary = await getCollectorCartSummary(session.user.id);

  if (!summary.isValidForCheckout) {
    redirect("/collector/releases");
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      stripeCustomerId: true,
      shippingCountry: true,
    },
  });

  let alreadyHasPaymentMethod = false;
  if (collectorProfile?.stripeCustomerId) {
    const methods = await stripe.paymentMethods.list({
      customer: collectorProfile.stripeCustomerId,
      type: "card",
      limit: 1,
    });
    alreadyHasPaymentMethod = methods.data.length > 0;
  }

  let priceSummary: {
    baseAmount: number;
    shippingAmount: number;
    markupAmount: number;
    taxAmount: number;
    totalEstimate: number;
    currency: string;
  } | null = null;
  if (collectorProfile && summary.cycleId && collectorProfile.shippingCountry) {
    const pricing = await getOrCreateCheckoutPricing(
      collectorProfile.id,
      summary.cycleId,
    );
    if (pricing) {
      priceSummary = {
        baseAmount: pricing.wholesaleTotalAmount,
        shippingAmount: 0,
        markupAmount: pricing.platformMarkupAmount,
        taxAmount: 0,
        totalEstimate: pricing.finalCollectorPrice,
        currency: pricing.currency,
      };
    }
  }

  const { getCurrentCycle } = await import("@/lib/actions/cycles");
  const currentCycle = await getCurrentCycle();

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      <div>
        <Link
          href="/collector/releases"
          className="text-xs text-ink/50 hover:text-ink mb-4 inline-block"
        >
          ← Back to releases
        </Link>
        <h1 className="text-2xl font-bold text-ink">Commit your booklet</h1>
        <p className="text-sm text-ink/60 mt-1">
          Save your card now — you won&apos;t be charged until the cycle closes.
        </p>
      </div>

      <div className="rounded-lg border border-beige-200 bg-white p-5 space-y-1">
        <p className="text-sm text-ink/70">
          <span className="font-medium text-ink">{summary.totalReleases}</span>{" "}
          release{summary.totalReleases !== 1 ? "s" : ""} ·{" "}
          <span className="font-medium text-ink">{summary.totalArtworks}</span>{" "}
          pages
        </p>
      </div>

      <CheckoutPaymentForm
        cycleLockDate={currentCycle?.lockDate?.toISOString() ?? null}
        priceSummary={priceSummary}
        alreadyHasPaymentMethod={alreadyHasPaymentMethod}
      />
    </div>
  );
}
