import { Package, ShoppingCart, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PricingEstimateCard } from "@/components/pricing-estimate-card";
import { PricingQuoteDisplay } from "@/components/pricing-quote-display";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";
import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { db } from "@/lib/db";
import { getQuote } from "@/lib/peecho/quote-service";

export default async function CollectorPricingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      shippingCountry: true,
      shippingStateCode: true,
      shippingCity: true,
      shippingAddressLine1: true,
      shippingZip: true,
    },
  });

  if (!collectorProfile) {
    redirect("/collector/setup");
  }

  const currentCycle = await getCurrentCycle();
  const summary = await getCollectorCartSummary(session.user.id);

  // Get committed checkout intent with exact Peecho order pricing
  const checkoutIntent =
    currentCycle && summary.cycleId
      ? await db.checkoutIntent.findUnique({
          where: {
            collectorProfileId_cycleId: {
              collectorProfileId: collectorProfile.id,
              cycleId: currentCycle.id,
            },
          },
          select: {
            committedAt: true,
            peechoOrderId: true,
            retailTotalAmount: true,
            wholesaleTotalAmount: true,
            platformMarkupAmount: true,
            quoteInputPageCount: true,
            updatedAt: true,
            orderedManually: true,
          },
        })
      : null;

  // Calculate current live page count from selections
  let currentPageCount = 0;
  if (currentCycle && summary.cycleId && summary.totalArtworks > 0) {
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
    if (selections.length > 0) {
      const { totalPages } = computeBookletPageCount(selections as any);
      currentPageCount = totalPages;
    }
  }

  const isCommitted =
    !!checkoutIntent?.committedAt && !!checkoutIntent.retailTotalAmount;

  // Fetch initial estimate for non-committed orders
  let initialEstimate: {
    baseAmount: number;
    shippingAmount: number;
    markupAmount: number;
    taxAmount: number;
    totalEstimate: number;
    currency: string;
    pageCount: number;
  } | null = null;

  if (
    !isCommitted &&
    collectorProfile.shippingCountry &&
    currentCycle &&
    summary.totalArtworks > 0
  ) {
    try {
      const quote = await getQuote({
        country: collectorProfile.shippingCountry,
        countryStateCode: collectorProfile.shippingStateCode ?? undefined,
        pageCount: currentPageCount,
      });
      initialEstimate = {
        baseAmount: quote.baseAmount,
        shippingAmount: quote.shippingAmount,
        markupAmount: quote.markupAmount,
        taxAmount: quote.taxAmount,
        totalEstimate: quote.totalEstimate,
        currency: quote.currency,
        pageCount: currentPageCount,
      };
    } catch {
      // Best-effort estimate fetch
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Booklet Pricing</h1>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Current amount due at cycle lock based on your selections and delivery
          address.
        </p>
      </div>

      {!collectorProfile.shippingCountry ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Please set your shipping country in{" "}
          <Link href="/collector/setup" className="underline font-medium">
            profile settings
          </Link>{" "}
          to get a pricing estimate.
        </div>
      ) : !currentCycle ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground/60">
          No active subscription cycle.
        </div>
      ) : summary.totalArtworks === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                No releases selected
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Select releases to build your booklet and get a price estimate.
              </p>
            </div>
          </div>
          <Link
            href="/collector/releases"
            className="inline-block rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
          >
            Browse releases
          </Link>
        </div>
      ) : !isCommitted ? (
        <>
          <PricingEstimateCard
            estimate={initialEstimate}
            totalReleases={summary.totalReleases}
            totalPages={currentPageCount}
            cycleLockDate={currentCycle.lockDate?.toISOString() ?? null}
          />
          <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4">
            <p className="text-sm font-medium text-fuchsia-800 mb-2">
              Ready to order?
            </p>
            <p className="text-sm text-fuchsia-700 mb-3">
              Complete checkout to lock in your price and place your order.
            </p>
            <Link
              href="/collector/checkout"
              className="inline-flex items-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Order Now
            </Link>
          </div>
        </>
      ) : (
        <>
          <PricingQuoteDisplay
            committed={true}
            initialPricing={{
              retailTotalAmount: Number(checkoutIntent.retailTotalAmount),
              wholesaleTotalAmount: Number(checkoutIntent.wholesaleTotalAmount),
              platformMarkupAmount: Number(checkoutIntent.platformMarkupAmount),
              currency: "EUR",
              pageCount: checkoutIntent.quoteInputPageCount ?? currentPageCount,
              updatedAt: checkoutIntent.updatedAt,
              peechoOrderId: checkoutIntent.peechoOrderId ?? undefined,
            }}
            cycleLockDate={currentCycle.lockDate?.toISOString() ?? null}
            totalReleases={summary.totalReleases}
            totalPages={currentPageCount}
          />
          {!checkoutIntent.orderedManually && (
            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4">
              <p className="text-sm font-medium text-fuchsia-800 mb-2">
                Want your booklet sooner?
              </p>
              <p className="text-sm text-fuchsia-700 mb-3">
                Skip the wait and get your booklet printed immediately.
              </p>
              <Link
                href="/collector/checkout"
                className="inline-flex items-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
              >
                <Zap className="h-4 w-4 mr-2" />
                Order Now — skip the wait
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
