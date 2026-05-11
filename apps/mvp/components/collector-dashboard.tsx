"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type CollectorData = {
  collectorProfile: any;
  subscriptions: any[];
  selections: any[];
  currentCycle: any;
};

type Props = {
  data: CollectorData;
};

export function CollectorDashboard({ data }: Props) {
  const { collectorProfile, subscriptions, selections, currentCycle } = data;

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
