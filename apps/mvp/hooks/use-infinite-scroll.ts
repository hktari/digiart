"use client";

import { useCallback, useMemo, useRef } from "react";
import useSWRInfinite from "swr/infinite";

type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

type UseInfiniteScrollOptions<T> = {
  url: string;
  searchParams?: Record<string, string | undefined>;
  pageSize?: number;
  fallback?: T[];
};

type UseInfiniteScrollReturn<T> = {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | undefined;
  sentinelRef: (node: HTMLElement | null) => void;
  size: number;
  setSize: (
    size: number | ((_size: number) => number),
  ) => Promise<PaginatedResponse<T>[] | undefined>;
};

const fetcher = async <T>(url: string): Promise<PaginatedResponse<T>> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return response.json();
};

export function useInfiniteScroll<T extends { id: string }>({
  url,
  searchParams = {},
  pageSize = 12,
  fallback,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingMoreRef = useRef(false);

  // Build the SWR key for each page
  const getKey = useCallback(
    (pageIndex: number, previousPageData: PaginatedResponse<T> | null) => {
      // First page, no cursor needed
      if (pageIndex === 0) {
        const params = new URLSearchParams({ take: String(pageSize) });
        for (const [key, value] of Object.entries(searchParams)) {
          if (value !== undefined && value !== null && value !== "") {
            params.set(key, value);
          }
        }
        return `${url}?${params.toString()}`;
      }

      // No more data
      if (!previousPageData || !previousPageData.nextCursor) {
        return null;
      }

      // Next page with cursor
      const params = new URLSearchParams({
        take: String(pageSize),
        cursor: previousPageData.nextCursor,
      });
      for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, value);
        }
      }
      return `${url}?${params.toString()}`;
    },
    [url, searchParams, pageSize],
  );

  const { data, error, isLoading, size, setSize } = useSWRInfinite<
    PaginatedResponse<T>,
    Error
  >(getKey, fetcher<T>, {
    fallbackData: fallback
      ? [{ items: fallback, nextCursor: null }]
      : undefined,
    revalidateFirstPage: false,
    parallel: false,
  });

  // Flatten and deduplicate items
  const items = useMemo(() => {
    if (!data) return [];
    const allItems = data.flatMap((page) => page.items);
    // Deduplicate by id
    const seen = new Set<string>();
    return allItems.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data]);

  // Check if there are more pages
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return true;
    const lastPage = data[data.length - 1];
    return lastPage.nextCursor !== null;
  }, [data]);

  // Loading more state (not initial load)
  const isLoadingMore = useMemo(() => {
    return Boolean(!isLoading && size > 0 && data && data.length < size);
  }, [isLoading, size, data]);

  // Load more function
  const loadMore = useCallback(() => {
    if (hasMore && !loadingMoreRef.current) {
      loadingMoreRef.current = true;
      setSize((prev) => prev + 1).finally(() => {
        loadingMoreRef.current = false;
      });
    }
  }, [hasMore, setSize]);

  // Intersection observer callback for the sentinel
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node && hasMore) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              loadMore();
            }
          },
          { rootMargin: "200px" },
        );
        observerRef.current.observe(node);
      }
    },
    [hasMore, loadMore],
  );

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
    size,
    setSize,
  };
}
