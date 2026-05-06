"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { BookletCartUI } from "@/components/booklet-cart-ui";
import {
  DISCOVER_BOOKLET_STORAGE_KEY,
  getStoredBooklet,
} from "@/hooks/use-booklet-toggle";
import { DISCOVER_BOOKLET_UPDATED_EVENT } from "@/lib/discover-booklet-events";

function DiscoverBookletBarInner() {
  const [summary, setSummary] = useState<{
    items: ReturnType<typeof getStoredBooklet>;
    totalReleases: number;
    totalArtworks: number;
  } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const loadSummary = useCallback(() => {
    const items = getStoredBooklet();
    const totalArtworks = items.reduce(
      (sum, item) => sum + item.artworkCount,
      0,
    );
    setSummary({
      items,
      totalReleases: items.length,
      totalArtworks,
    });
  }, []);

  useEffect(() => {
    loadSummary();
    setIsHydrated(true);
  }, [loadSummary]);

  useEffect(() => {
    const handleBookletUpdated = () => {
      loadSummary();
    };

    window.addEventListener(
      DISCOVER_BOOKLET_UPDATED_EVENT,
      handleBookletUpdated,
    );
    return () => {
      window.removeEventListener(
        DISCOVER_BOOKLET_UPDATED_EVENT,
        handleBookletUpdated,
      );
    };
  }, [loadSummary]);

  if (!isHydrated || !summary) return null;

  const statusText =
    summary.totalArtworks === 0
      ? "Your booklet is empty"
      : `${summary.totalArtworks} pages in your booklet`;

  const handleRemove = (releaseId: string) => {
    const items = getStoredBooklet();
    const nextItems = items.filter((item) => item.releaseId !== releaseId);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        DISCOVER_BOOKLET_STORAGE_KEY,
        JSON.stringify(nextItems),
      );
      window.dispatchEvent(new CustomEvent(DISCOVER_BOOKLET_UPDATED_EVENT));
    }
  };

  return (
    <BookletCartUI
      items={summary.items}
      totalReleases={summary.totalReleases}
      totalArtworks={summary.totalArtworks}
      mode="anon"
      onRemove={handleRemove}
      statusText={statusText}
    />
  );
}

export function DiscoverBookletBar() {
  return (
    <Suspense fallback={null}>
      <DiscoverBookletBarInner />
    </Suspense>
  );
}
