import { CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PricingQuoteDisplay } from "@/components/pricing-quote-display";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";
import { computeBookletPageCount } from "@/lib/booklet/page-count";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { db } from "@/lib/db";

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
    !!checkoutIntent?.committedAt &&
    !!checkoutIntent.retailTotalAmount &&
    !!checkoutIntent.peechoOrderId;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground>Booklet Pricing</h1>
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
        <div className="rounded-lg border border-beige-200 bg-white p-8 text-center text-sm text-muted-foreground/60">
          No active subscription cycle.
        </div>
      ) : !isCommitted ? (
        <div className="rounded-lg border border-beige-200 bg-white p-6 space-y-3">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground>
                No order placed yet
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Complete checkout to place your order. A price estimate based on
                your delivery address and current selections will be shown here.
              </p>
            </div>
          </div>
          <Link
            href="/collector/checkout"
            className="inline-block rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
          >
            Go to checkout
          </Link>
        </div>
      ) : (
        <PricingQuoteDisplay
          committed={true}
          initialPricing={{
            retailTotalAmount: Number(checkoutIntent.retailTotalAmount),
            wholesaleTotalAmount: Number(checkoutIntent.wholesaleTotalAmount),
            platformMarkupAmount: Number(checkoutIntent.platformMarkupAmount),
            currency: "EUR",
            pageCount: checkoutIntent.quoteInputPageCount ?? currentPageCount,
            updatedAt: checkoutIntent.updatedAt,
            peechoOrderId: checkoutIntent.peechoOrderId!,
          }}
          cycleLockDate={currentCycle.lockDate?.toISOString() ?? null}
          totalReleases={summary.totalReleases}
          totalPages={currentPageCount}
        />
      )}
    </div>
  );
}
