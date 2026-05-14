"use client";

import { CheckCircle, Package } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { InfiniteScrollSentinel } from "@/components/infinite-scroll-sentinel";
import { ReleaseSelectionGrid } from "@/components/release-selection-grid";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

type Release = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  artworkLimit: number;
  creatorProfile: {
    id: string;
    displayName: string;
    slug: string;
    avatar: string | null;
  };
  artworks: Array<{
    artwork: {
      id: string;
      title: string;
      storageKey: string;
      orientation: string;
      thumbnailUrl: string;
    };
  }>;
  tags: Array<{
    tag: {
      name: string;
      slug: string;
    };
  }>;
  _count: {
    artworks: number;
  };
};

type CurrentCycle = {
  id: string;
  label: string;
  lockDate: string;
};

type QuoteData = {
  totalEstimate: number;
  currency: string;
  pageCount: number;
};

type CheckoutIntentData = {
  orderedManually: boolean;
  orderedAt: string | null;
  retailTotalAmount: number | null;
};

type CollectorReleasesClientProps = {
  initialReleases: Release[];
  initialSelectedReleaseIds: Set<string>;
  currentCycle: CurrentCycle;
  initialQuote: QuoteData | null;
  checkoutIntent: CheckoutIntentData | null;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

export function CollectorReleasesClient({
  initialReleases,
  initialSelectedReleaseIds,
  currentCycle,
  initialQuote,
  checkoutIntent,
}: CollectorReleasesClientProps) {
  const { items, isLoading, isLoadingMore, hasMore, sentinelRef } =
    useInfiniteScroll<Release>({
      url: "/api/collector/releases",
      searchParams: { cycleId: currentCycle.id },
      pageSize: 12,
      fallback: initialReleases,
    });

  const selectedCount = initialSelectedReleaseIds.size;
  const hasSelections = selectedCount > 0;
  const alreadyOrdered = checkoutIntent?.orderedManually ?? false;

  // Calculate total page count from selections
  const totalPages = useMemo(() => {
    if (!initialQuote?.pageCount) return 0;
    return initialQuote.pageCount;
  }, [initialQuote]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Booklet Release Selection
              </h1>
              <p className="mt-2 text-muted-foreground">
                Build your {currentCycle.label} booklet by selecting releases,
                not individual artworks
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Selected</div>
              <div className="text-2xl font-bold text-fuchsia-600">
                {initialSelectedReleaseIds.size}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                role="img"
              >
                <title>Calendar icon</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-muted-foreground">
                Lock date:{" "}
                <span className="font-medium text-foreground">
                  {new Date(currentCycle.lockDate).toLocaleDateString()}
                </span>
              </span>
            </div>
          </div>
        </div>

        {items.length === 0 && !isLoading ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-ocean-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-ocean-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                No releases available
              </h2>
              <p className="text-muted-foreground">
                Subscribe to more creators to see their releases here.
              </p>
              <Link
                href="/browse"
                className="inline-block px-4 py-2 rounded-lg bg-fuchsia-600 text-white font-medium hover:bg-fuchsia-700 transition-colors"
              >
                Browse creators
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ReleaseSelectionGrid
              releases={items}
              selectedReleaseIds={initialSelectedReleaseIds}
              cycleId={currentCycle.id}
            />
            <InfiniteScrollSentinel
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              hasItems={items.length > 0}
              sentinelRef={sentinelRef}
            />
          </>
        )}

        {items.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/browse"
              className="text-sm text-fuchsia-600 hover:text-fuchsia-700 font-medium"
            >
              Discover more releases →
            </Link>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA bar */}
      {hasSelections && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-4 shadow-lg">
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-fuchsia-100 p-2">
                <Package className="h-5 w-5 text-fuchsia-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedCount} release{selectedCount !== 1 ? "s" : ""}
                  {totalPages > 0 && ` · ${totalPages} pages`}
                </p>
                {initialQuote?.totalEstimate && !alreadyOrdered && (
                  <p className="text-xs text-muted-foreground">
                    Est.{" "}
                    {formatCurrency(
                      initialQuote.totalEstimate,
                      initialQuote.currency,
                    )}
                  </p>
                )}
              </div>
            </div>

            {alreadyOrdered ? (
              <Link
                href="/collector/orders"
                className="flex items-center gap-2 rounded-lg bg-jade-100 px-4 py-2 text-sm font-medium text-jade-700 hover:bg-jade-200 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Booklet ordered
              </Link>
            ) : (
              <Link
                href="/collector/checkout"
                className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
              >
                Review & Order
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
