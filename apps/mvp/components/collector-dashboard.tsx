"use client";

import Link from "next/link";

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
        <div className="rounded-2xl border border-ocean-100 bg-ocean-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Artists followed
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">
            {subscriptions.length}
          </p>
        </div>
        <div className="rounded-2xl border border-ocean-100 bg-ocean-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Releases selected
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">
            {selections.length}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Shipping profile
          </p>
          <p className="mt-3 text-lg font-bold text-neutral-900">
            {collectorProfile?.shippingCountry ?? "Setup needed"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={collectorProfile ? "/collector/releases" : "/collector/setup"}
          className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-ocean-300 hover:bg-ocean-50/30"
        >
          <p className="text-sm font-semibold text-neutral-900">
            Continue booklet
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Select releases for the active cycle.
          </p>
        </Link>
        <Link
          href={
            collectorProfile
              ? "/collector/subscriptions"
              : "/collector/setup"
          }
          className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-ocean-300 hover:bg-ocean-50/30"
        >
          <p className="text-sm font-semibold text-neutral-900">
            Manage following
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Follow or remove artists feeding your release pool.
          </p>
        </Link>
        <Link
          href={
            collectorProfile ? "/collector/discover" : "/collector/setup"
          }
          className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-ocean-300 hover:bg-ocean-50/30"
        >
          <p className="text-sm font-semibold text-neutral-900">
            Discover releases
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Browse more creators and releases for the next booklet.
          </p>
        </Link>
        <Link
          href={collectorProfile ? "/collector/pricing" : "/collector/setup"}
          className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-ocean-300 hover:bg-ocean-50/30"
        >
          <p className="text-sm font-semibold text-neutral-900">
            Review pricing
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            See print, shipping, tax, and total estimate details.
          </p>
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Recent artists you follow
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Jump back into creators shaping your current booklet options.
            </p>
          </div>
          <Link
            href="/collector/subscriptions"
            className="text-sm font-medium text-ocean-600 hover:text-ocean-700"
          >
            View all &rarr;
          </Link>
        </div>
        {subscriptions.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            No artists followed yet.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {subscriptions.slice(0, 4).map((subscription) => (
              <Link
                key={subscription.id}
                href={`/creators/${subscription.creatorProfile.slug}`}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:border-ocean-300 hover:text-ocean-700"
              >
                {subscription.creatorProfile.displayName}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
