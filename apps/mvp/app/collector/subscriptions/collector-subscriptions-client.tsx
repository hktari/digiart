"use client";

import Image from "next/image";
import Link from "next/link";
import { CollectorUnsubscribeButton } from "@/components/collector-unsubscribe-button";
import { InfiniteScrollSentinel } from "@/components/infinite-scroll-sentinel";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

type Subscription = {
  id: string;
  createdAt: string;
  creatorProfile: {
    id: string;
    slug: string;
    displayName: string;
    avatar: string | null;
    bio: string | null;
  };
};

type CollectorSubscriptionsClientProps = {
  initialSubscriptions: Subscription[];
};

export function CollectorSubscriptionsClient({
  initialSubscriptions,
}: CollectorSubscriptionsClientProps) {
  const { items, isLoading, isLoadingMore, hasMore, sentinelRef } =
    useInfiniteScroll<Subscription>({
      url: "/api/collector/subscriptions",
      pageSize: 12,
      fallback: initialSubscriptions,
    });

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:text-neutral-600"
          >
            Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">
            Artists You Follow
          </h1>
          <p className="mt-2 text-neutral-600">
            These artists feed the release pool you use to build upcoming
            booklets.
          </p>
        </div>

        {items.length === 0 && !isLoading ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fuchsia-100">
                <svg
                  className="h-8 w-8 text-fuchsia-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">
                No artists followed yet
              </h2>
              <p className="text-neutral-600">
                Start by discovering artists whose releases you want available
                in your booklet workflow.
              </p>
              <Link
                href="/browse"
                className="inline-flex items-center rounded-md border border-transparent bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-700"
              >
                Browse artists
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((subscription) => (
                <div
                  key={subscription.id}
                  className="rounded-lg border border-neutral-200 bg-white p-6 transition-all hover:border-fuchsia-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <Link
                      href={`/creators/${subscription.creatorProfile.slug}`}
                    >
                      {subscription.creatorProfile.avatar ? (
                        <Image
                          src={subscription.creatorProfile.avatar}
                          alt={subscription.creatorProfile.displayName}
                          width={64}
                          height={64}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-linear-to-br from-fuchsia-100 to-ocean-100">
                          <span className="text-2xl font-bold">
                            {subscription.creatorProfile.displayName
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/creators/${subscription.creatorProfile.slug}`}
                      >
                        <h3 className="truncate font-semibold text-neutral-900 hover:text-fuchsia-700">
                          {subscription.creatorProfile.displayName}
                        </h3>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                        {subscription.creatorProfile.bio || "No bio available"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-jade-100 px-2.5 py-0.5 text-xs font-medium text-jade-800">
                        Active
                      </span>
                      <span className="text-xs text-neutral-500">
                        Since{" "}
                        {new Date(subscription.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <CollectorUnsubscribeButton
                      subscriptionId={subscription.id}
                    />
                  </div>
                </div>
              ))}
            </div>
            <InfiniteScrollSentinel
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              hasItems={items.length > 0}
              sentinelRef={sentinelRef}
            />
          </>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/browse"
            className="text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
          >
            Discover more artists →
          </Link>
        </div>
      </div>
    </div>
  );
}
