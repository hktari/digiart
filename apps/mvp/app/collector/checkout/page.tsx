import { redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { CheckoutPaymentForm } from "@/components/checkout-payment-form";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { db } from "@/lib/db";
import { getQuote } from "@/lib/peecho/quote-service";

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
      shippingCountry: true,
      shippingStateCode: true,
      shippingName: true,
      shippingAddressLine1: true,
      shippingCity: true,
      shippingZip: true,
    },
  });

  // Get estimate from quote endpoint (pre-order, estimate only)
  let estimateSummary: {
    baseAmount: number;
    shippingAmount: number;
    markupAmount: number;
    taxAmount: number;
    totalEstimate: number;
    currency: string;
  } | null = null;

  if (collectorProfile?.shippingCountry && summary.cycleId) {
    try {
      const selections = await db.collectorReleaseSelection.findMany({
        where: {
          collectorProfileId: collectorProfile.id,
          cycleId: summary.cycleId,
        },
        include: {
          release: {
            include: {
              artworks: { include: { artwork: { select: { id: true } } } },
            },
          },
        },
      });
      if (selections.length > 0) {
        const { totalPages } = computeBookletPageCount(selections as any);
        const quote = await getQuote({
          country: collectorProfile.shippingCountry,
          countryStateCode: collectorProfile.shippingStateCode ?? undefined,
          pageCount: totalPages,
        });
        estimateSummary = {
          baseAmount: quote.baseAmount,
          shippingAmount: quote.shippingAmount,
          markupAmount: quote.markupAmount,
          taxAmount: quote.taxAmount,
          totalEstimate: quote.totalEstimate,
          currency: quote.currency,
        };
      }
    } catch {
      // best-effort
    }
  }

  // Allowed countries for the Stripe AddressElement
  const fulfillmentCountries = await db.fulfillmentCountry.findMany({
    where: { isActive: true },
    select: { code: true },
  });
  const allowedCountries = fulfillmentCountries.map((c) => c.code);

  const currentCycle = await getCurrentCycle();

  const defaultAddress = collectorProfile
    ? {
        name: collectorProfile.shippingName ?? undefined,
        line1: collectorProfile.shippingAddressLine1 ?? undefined,
        city: collectorProfile.shippingCity ?? undefined,
        state: collectorProfile.shippingStateCode ?? undefined,
        postal_code: collectorProfile.shippingZip ?? undefined,
        country: collectorProfile.shippingCountry ?? undefined,
      }
    : null;

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6 text-white">
      <div>
        <BackLink
          href="/collector/releases"
          className="text-xs text-ink/50 hover:text-ink mb-4 inline-block"
        >
          Back to releases
        </BackLink>
        <h1 className="text-2xl font-bold">Order your booklet</h1>
        <p className="text-sm text-ink/60 mt-1">
          Enter your delivery address to get a price estimate, then save your
          card.{" "}
          {currentCycle?.lockDate
            ? `You will be charged on ${new Date(currentCycle.lockDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
            : "You will be charged when the cycle closes."}{" "}
          You can change your selections freely until then.
        </p>
      </div>

      <div className="rounded-lg border border-beige-200 bg-white p-4">
        <p className="text-sm text-ink/70">
          <span className="font-medium text-ink">{summary.totalReleases}</span>{" "}
          release{summary.totalReleases !== 1 ? "s" : ""} ·{" "}
          <span className="font-medium text-ink">{summary.totalArtworks}</span>{" "}
          pages
        </p>
      </div>

      <CheckoutPaymentForm
        cycleLockDate={currentCycle?.lockDate?.toISOString() ?? null}
        estimateSummary={estimateSummary}
        defaultAddress={defaultAddress}
        allowedCountries={allowedCountries}
      />
    </div>
  );
}
