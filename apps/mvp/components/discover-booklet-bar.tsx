"use client";

import { ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { DISCOVER_BOOKLET_UPDATED_EVENT } from "@/lib/discover-booklet-events";

type BookletItem = {
  releaseId: string;
  title: string;
  creatorDisplayName: string;
  creatorSlug: string;
  artworkCount: number;
};

const STORAGE_KEY = "discover-booklet";

function getStoredBooklet(): BookletItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStoredBooklet(items: BookletItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type BookletSummary = {
  items: BookletItem[];
  totalReleases: number;
  totalArtworks: number;
};

function useBookletSummary(): BookletSummary | null {
  const [summary, setSummary] = useState<BookletSummary | null>(null);
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

  if (!isHydrated) return null;
  return summary;
}

function DiscoverBookletBarInner() {
  const summary = useBookletSummary();
  const [isOpen, setIsOpen] = useState(false);

  const removeRelease = (releaseId: string) => {
    const items = getStoredBooklet();
    const nextItems = items.filter((item) => item.releaseId !== releaseId);
    setStoredBooklet(nextItems);
    // Dispatch event to update all components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DISCOVER_BOOKLET_UPDATED_EVENT));
    }
  };

  const statusText = useMemo(() => {
    if (!summary) return "Loading...";
    if (summary.totalArtworks === 0) return "Your booklet is empty";
    return `${summary.totalArtworks} pages in your booklet`;
  }, [summary]);

  // Hide entirely when booklet is empty
  if (!summary || summary.totalReleases === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 border-l border-beige-200 bg-paper/95 backdrop-blur-sm p-4 flex-col gap-3 overflow-y-auto">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink/50">
          Booklet Builder
        </h2>
        <p className="text-sm text-ink/80">
          {summary.totalArtworks} pages from {summary.totalReleases}{" "}
          {summary.totalReleases === 1 ? "release" : "releases"}
        </p>
        <p className="text-xs text-ink/60">{statusText}</p>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {summary.items.map((item) => (
            <div
              key={item.releaseId}
              className="rounded border border-beige-200 bg-white p-2"
            >
              <p className="text-sm font-medium text-ink">{item.title}</p>
              <p className="text-xs text-ink/60">
                {item.creatorDisplayName} · {item.artworkCount}{" "}
                {item.artworkCount === 1 ? "page" : "pages"}
              </p>
              <div className="mt-2 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => removeRelease(item.releaseId)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/auth/sign-in?redirect=/collector/discover"
          className="mt-auto rounded px-3 py-2 text-center text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700"
        >
          Sign up to subscribe
        </Link>
      </aside>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-beige-200 bg-paper px-4 py-2">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  Booklet builder · {summary.totalReleases}{" "}
                  {summary.totalReleases === 1 ? "release" : "releases"}
                </span>
              </p>
              <p className="text-xs text-ink/60">{statusText}</p>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-ink/60 shrink-0" />
            ) : (
              <ChevronUp className="h-4 w-4 text-ink/60 shrink-0" />
            )}
          </div>
        </button>
        {isOpen && (
          <div className="mt-2 max-h-[calc(100vh-11rem)] overflow-y-auto space-y-2 pb-2">
            {summary.items.map((item) => (
              <div
                key={item.releaseId}
                className="rounded border border-beige-200 bg-white p-2"
              >
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="text-xs text-ink/60">
                  {item.creatorDisplayName} · {item.artworkCount}{" "}
                  {item.artworkCount === 1 ? "page" : "pages"}
                </p>
                <div className="mt-2 flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => removeRelease(item.releaseId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <Link
              href="/auth/sign-in?redirect=/collector/discover"
              className="block rounded px-3 py-2 text-center text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700"
            >
              Sign up to subscribe
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export function DiscoverBookletBar() {
  return (
    <Suspense fallback={null}>
      <DiscoverBookletBarInner />
    </Suspense>
  );
}
