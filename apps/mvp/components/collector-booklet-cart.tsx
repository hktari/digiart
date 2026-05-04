"use client";

import { ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
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
import {
  commitBookletForCycle,
  toggleReleaseSelection,
} from "@/lib/actions/collector";
import { COLLECTOR_CART_UPDATED_EVENT } from "@/lib/cart-events";

interface CartQuote {
  baseAmount: number;
  shippingAmount: number;
  markupAmount: number;
  taxAmount: number;
  totalEstimate: number;
  currency: string;
  isFrozen: boolean;
  quotedAt: Date | null;
}

interface CartCheckoutIntent {
  committedAt: string;
  acceptedEstimateDisclaimer: boolean;
}

interface CartData extends CollectorCartSummary {
  quote: CartQuote | null;
  checkoutIntent: CartCheckoutIntent | null;
  cycleLockDate: string | null;
}

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
  const [summary, setSummary] = useState<CartData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitSuccess, setCommitSuccess] = useState(false);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/collector/cart-summary", {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as CartData;
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

  const handleCommit = () => {
    setCommitError(null);
    setCommitSuccess(false);
    startTransition(async () => {
      const result = await commitBookletForCycle();
      if (result.success) {
        setCommitSuccess(true);
        await loadSummary();
      } else {
        setCommitError(result.error);
      }
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  };

  const lockDateFormatted = summary?.cycleLockDate
    ? new Date(summary.cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

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

        {summary.quote && (
          <div className="border-t border-beige-200 pt-3 space-y-1">
            <div className="flex justify-between text-xs text-ink/70">
              <span>Production</span>
              <span>
                {formatCurrency(
                  summary.quote.baseAmount,
                  summary.quote.currency,
                )}
              </span>
            </div>
            <div className="flex justify-between text-xs text-ink/70">
              <span>Shipping</span>
              <span>
                {formatCurrency(
                  summary.quote.shippingAmount,
                  summary.quote.currency,
                )}
              </span>
            </div>
            {summary.quote.markupAmount > 0 && (
              <div className="flex justify-between text-xs text-ink/70">
                <span>Platform fee</span>
                <span>
                  {formatCurrency(
                    summary.quote.markupAmount,
                    summary.quote.currency,
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs text-ink/70">
              <span>Tax</span>
              <span>
                {formatCurrency(
                  summary.quote.taxAmount,
                  summary.quote.currency,
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-ink pt-1 border-t border-beige-100">
              <span>
                {summary.quote.isFrozen ? "Locked total" : "Estimated total"}
              </span>
              <span>
                {formatCurrency(
                  summary.quote.totalEstimate,
                  summary.quote.currency,
                )}
              </span>
            </div>
            {!summary.quote.isFrozen && (
              <p className="text-[11px] text-ink/50">
                Final price is locked at cycle end based on your selections and
                delivery address.
              </p>
            )}
          </div>
        )}

        {summary.checkoutIntent && (
          <div className="rounded bg-green-50 border border-green-200 p-2 text-xs text-green-800">
            Booklet committed{" "}
            {lockDateFormatted && `— charged on ${lockDateFormatted}`}
          </div>
        )}

        {commitError && (
          <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-700">
            {commitError}
          </div>
        )}

        {commitSuccess && !summary.checkoutIntent && (
          <div className="rounded bg-green-50 border border-green-200 p-2 text-xs text-green-800">
            Booklet committed successfully!
          </div>
        )}

        <button
          type="button"
          disabled={isPending || !summary.isValidForCheckout}
          onClick={handleCommit}
          className={`mt-auto rounded px-3 py-2 text-center text-sm font-semibold ${
            summary.isValidForCheckout
              ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
              : "bg-neutral-300 text-neutral-600 cursor-not-allowed"
          }`}
        >
          {summary.checkoutIntent
            ? "Update commit"
            : "Commit booklet — you'll be charged when the cycle closes"}
        </button>
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

            {summary.quote && (
              <div className="border-t border-beige-200 pt-2 space-y-1">
                <div className="flex justify-between text-xs text-ink/70">
                  <span>Production</span>
                  <span>
                    {formatCurrency(
                      summary.quote.baseAmount,
                      summary.quote.currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-ink/70">
                  <span>Shipping</span>
                  <span>
                    {formatCurrency(
                      summary.quote.shippingAmount,
                      summary.quote.currency,
                    )}
                  </span>
                </div>
                {summary.quote.markupAmount > 0 && (
                  <div className="flex justify-between text-xs text-ink/70">
                    <span>Platform fee</span>
                    <span>
                      {formatCurrency(
                        summary.quote.markupAmount,
                        summary.quote.currency,
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-ink/70">
                  <span>Tax</span>
                  <span>
                    {formatCurrency(
                      summary.quote.taxAmount,
                      summary.quote.currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-ink pt-1 border-t border-beige-100">
                  <span>
                    {summary.quote.isFrozen
                      ? "Locked total"
                      : "Estimated total"}
                  </span>
                  <span>
                    {formatCurrency(
                      summary.quote.totalEstimate,
                      summary.quote.currency,
                    )}
                  </span>
                </div>
                {!summary.quote.isFrozen && (
                  <p className="text-[11px] text-ink/50">
                    Final price is locked at cycle end based on your selections
                    and delivery address.
                  </p>
                )}
              </div>
            )}

            {summary.checkoutIntent && (
              <div className="rounded bg-green-50 border border-green-200 p-2 text-xs text-green-800">
                Booklet committed{" "}
                {lockDateFormatted && `— charged on ${lockDateFormatted}`}
              </div>
            )}

            {commitError && (
              <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                {commitError}
              </div>
            )}

            <button
              type="button"
              disabled={isPending || !summary.isValidForCheckout}
              onClick={handleCommit}
              className={`block w-full rounded px-3 py-2 text-center text-sm font-semibold ${
                summary.isValidForCheckout
                  ? "bg-fuchsia-600 text-white"
                  : "bg-neutral-300 text-neutral-600"
              }`}
            >
              {summary.checkoutIntent
                ? "Update commit"
                : "Commit booklet — you'll be charged when the cycle closes"}
            </button>
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
