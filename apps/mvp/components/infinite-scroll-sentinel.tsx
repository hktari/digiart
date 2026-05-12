"use client";

import { Loader2 } from "lucide-react";

type InfiniteScrollSentinelProps = {
  isLoadingMore: boolean;
  hasMore: boolean;
  hasItems: boolean;
  sentinelRef: (node: HTMLElement | null) => void;
};

export function InfiniteScrollSentinel({
  isLoadingMore,
  hasMore,
  hasItems,
  sentinelRef,
}: InfiniteScrollSentinelProps) {
  // Don't render anything if there are no items and not loading
  if (!hasItems && !isLoadingMore) {
    return null;
  }

  return (
    <div
      ref={sentinelRef}
      className="py-8 flex items-center justify-center"
      aria-live="polite"
    >
      {isLoadingMore && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading more...</span>
        </div>
      )}
      {!hasMore && hasItems && (
        <span className="text-sm text-muted-foreground">No more results</span>
      )}
    </div>
  );
}
