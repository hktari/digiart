"use client";

import { ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { CollectorCartSummary } from "@/lib/actions/collector";
import { toggleReleaseSelection } from "@/lib/actions/collector";
import { COLLECTOR_CART_UPDATED_EVENT } from "@/lib/cart-events";

function statusText(summary: CollectorCartSummary) {
  if (!summary.cycleId) return "No open cycle";
  if (summary.artworksOver > 0)
    return `${summary.artworksOver} pages over target`;
  if (summary.artworksNeeded > 0)
    return `${summary.artworksNeeded} pages still needed`;
  return "Ready for checkout";
}

function CollectorBookletCartInner() {
  const _pathname = usePathname();
  const _searchParams = useSearchParams();
  const [summary, setSummary] = useState<CollectorCartSummary | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/collector/cart-summary", {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as CollectorCartSummary;
    setSummary(data);
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleCartUpdated = () => {
      void loadSummary();
    };

    window.addEventListener(COLLECTOR_CART_UPDATED_EVENT, handleCartUpdated);
    return () => {
      window.removeEventListener(
        COLLECTOR_CART_UPDATED_EVENT,
        handleCartUpdated,
      );
    };
  }, [loadSummary]);

  const status = useMemo(
    () => (summary ? statusText(summary) : "Loading..."),
    [summary],
  );

  const removeRelease = (releaseId: string) => {
    if (!summary?.cycleId) return;
    startTransition(async () => {
      await toggleReleaseSelection(releaseId, summary.cycleId as string);
      await loadSummary();
    });
  };

  if (!summary) return null;

  return (
    <>
      <aside className="hidden lg:flex fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 border-l border-beige-200 bg-paper/95 backdrop-blur-sm p-4 flex-col gap-3 overflow-y-auto">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink/50">
          Booklet Builder
        </h2>
        <p className="text-sm text-ink/80">
          {summary.totalArtworks} pages from {summary.totalReleases} releases (
          {summary.minRequired}-{summary.maxAllowed})
        </p>
        <p className="text-xs text-ink/60">{status}</p>
        <div className="space-y-2">
          {summary.selectedReleases.map((item) => (
            <div
              key={item.releaseId}
              className="rounded border border-beige-200 bg-white p-2"
            >
              <p className="text-sm font-medium text-ink">{item.title}</p>
              <p className="text-xs text-ink/60">
                {item.creatorDisplayName} · {item.artworkCount} artworks
              </p>
              <p className="text-[11px] text-ink/50 mt-0.5">
                {item.source === "AUTO_SUBSCRIPTION"
                  ? "Auto-added from subscription"
                  : "Manually added"}
              </p>
              <div className="mt-2 flex items-center text-xs">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => removeRelease(item.releaseId)}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/collector/checkout"
          className={`mt-auto rounded px-3 py-2 text-center text-sm font-semibold ${
            summary.isValidForCheckout
              ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
              : "bg-neutral-300 text-neutral-600 pointer-events-none"
          }`}
        >
          Subscribe for upcoming cycle
        </Link>
      </aside>

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
                  Booklet builder · {summary.totalReleases} releases
                </span>
              </p>
              <p className="text-xs text-ink/60">{status}</p>
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
            {summary.selectedReleases.map((item) => (
              <div
                key={item.releaseId}
                className="rounded border border-beige-200 bg-white p-2"
              >
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="text-xs text-ink/60">
                  {item.creatorDisplayName} · {item.artworkCount} artworks
                </p>
                <p className="text-[11px] text-ink/50 mt-0.5">
                  {item.source === "AUTO_SUBSCRIPTION"
                    ? "Auto-added from subscription"
                    : "Manually added"}
                </p>
                <div className="mt-2 flex items-center text-xs">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => removeRelease(item.releaseId)}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <Link
              href="/collector/checkout"
              className={`block rounded px-3 py-2 text-center text-sm font-semibold ${
                summary.isValidForCheckout
                  ? "bg-fuchsia-600 text-white"
                  : "bg-neutral-300 text-neutral-600 pointer-events-none"
              }`}
            >
              Subscribe for upcoming cycle
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export function CollectorBookletCart() {
  return (
    <Suspense fallback={null}>
      <CollectorBookletCartInner />
    </Suspense>
  );
}
