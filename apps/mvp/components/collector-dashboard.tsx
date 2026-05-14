"use client";

import { CheckCircle, Lock, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type CheckoutIntentData = {
  orderedManually: boolean;
  orderedAt: string | null;
  retailTotalAmount: number | null;
  committedAt: string | null;
};

type CollectorData = {
  collectorProfile: any;
  subscriptions: any[];
  selections: any[];
  currentCycle: any;
  checkoutIntent: CheckoutIntentData | null;
};

type Props = {
  data: CollectorData;
};

export function CollectorDashboard({ data }: Props) {
  const {
    collectorProfile,
    subscriptions,
    selections,
    currentCycle,
    checkoutIntent,
  } = data;

  const hasSelections = selections.length > 0;
  const alreadyOrdered = checkoutIntent?.orderedManually ?? false;
  const isCommitted = checkoutIntent?.committedAt != null;
  const lockDate = currentCycle?.lockDate
    ? new Date(currentCycle.lockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-ocean-500/5 border-ocean-500/20">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Artists followed
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {subscriptions.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-ocean-500/5 border-ocean-500/20">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Releases selected
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {selections.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Shipping profile
            </p>
            <p className="mt-3 text-lg font-bold text-foreground">
              {collectorProfile?.shippingCountry ?? "Setup needed"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order CTA Card */}
      {hasSelections && (
        <Card
          className={
            alreadyOrdered
              ? "border-jade-200 bg-jade-50"
              : isCommitted
                ? "border-fuchsia-200 bg-fuchsia-50"
                : "border-ocean-200 bg-ocean-50/50"
          }
        >
          <CardContent className="p-5">
            {alreadyOrdered ? (
              <Link href="/collector/orders" className="flex items-start gap-3">
                <div className="rounded-full bg-jade-100 p-2">
                  <CheckCircle className="h-5 w-5 text-jade-600" />
                </div>
                <div>
                  <p className="font-semibold text-jade-800">Booklet ordered</p>
                  <p className="text-sm text-jade-700 mt-0.5">
                    Your booklet is being printed and will ship soon. Track your
                    order in My Orders.
                  </p>
                </div>
              </Link>
            ) : isCommitted ? (
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-fuchsia-100 p-2">
                  <Lock className="h-5 w-5 text-fuchsia-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-fuchsia-800">
                    Booklet committed
                  </p>
                  <p className="text-sm text-fuchsia-700 mt-0.5">
                    Your card will be charged{lockDate ? ` on ${lockDate}` : ""}
                    . You can still change selections until then.
                  </p>
                  <Link
                    href="/collector/checkout"
                    className="mt-3 inline-flex items-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
                  >
                    Order Now — skip the wait
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                href="/collector/checkout"
                className="flex items-start gap-3"
              >
                <div className="rounded-full bg-ocean-100 p-2">
                  <Package className="h-5 w-5 text-ocean-600" />
                </div>
                <div>
                  <p className="font-semibold text-ocean-800">
                    Order your booklet
                  </p>
                  <p className="text-sm text-ocean-700 mt-0.5">
                    {selections.length} release
                    {selections.length !== 1 ? "s" : ""} selected. Review
                    pricing and place your order.
                  </p>
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={collectorProfile ? "/collector/releases" : "/collector/setup"}
          className="rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-ocean-500/30 hover:bg-ocean-500/5"
        >
          <p className="text-sm font-semibold text-card-foreground">
            Continue booklet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Select releases for the active cycle.
          </p>
        </Link>
        <Link
          href={
            collectorProfile ? "/collector/subscriptions" : "/collector/setup"
          }
          className="rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-ocean-500/30 hover:bg-ocean-500/5"
        >
          <p className="text-sm font-semibold text-card-foreground">
            Manage following
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow or remove artists feeding your release pool.
          </p>
        </Link>
        <Link
          href={collectorProfile ? "/browse" : "/collector/setup"}
          className="rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-ocean-500/30 hover:bg-ocean-500/5"
        >
          <p className="text-sm font-semibold text-card-foreground">
            Discover releases
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse more creators and releases for the next booklet.
          </p>
        </Link>
        <Link
          href={collectorProfile ? "/collector/pricing" : "/collector/setup"}
          className="rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-ocean-500/30 hover:bg-ocean-500/5"
        >
          <p className="text-sm font-semibold text-card-foreground">
            Review pricing
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            See print, shipping, tax, and total estimate details.
          </p>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-card-foreground">
                Recent artists you follow
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Jump back into creators shaping your current booklet options.
              </p>
            </div>
            <Link
              href="/collector/subscriptions"
              className="text-sm font-medium text-ocean-500 hover:text-ocean-400"
            >
              View all &rarr;
            </Link>
          </div>
          {subscriptions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No artists followed yet.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {subscriptions.slice(0, 4).map((subscription) => (
                <Link
                  key={subscription.id}
                  href={`/creators/${subscription.creatorProfile.slug}`}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-ocean-500/30 hover:text-ocean-400"
                >
                  {subscription.creatorProfile.displayName}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
