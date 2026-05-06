"use client";

import { ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type BookletCartItem = {
  releaseId: string;
  title: string;
  creatorDisplayName: string;
  artworkCount: number;
  source?: "AUTO_SUBSCRIPTION" | "MANUAL";
};

export type BookletCartQuote = {
  baseAmount: number;
  shippingAmount: number;
  markupAmount: number;
  taxAmount: number;
  totalEstimate: number;
  currency: string;
  isFrozen: boolean;
};

export type BookletCartCheckoutIntent = {
  committedAt: string;
  acceptedEstimateDisclaimer: boolean;
};

type BookletCartMode = "anon" | "auth";

type BookletCartUIProps = {
  items: BookletCartItem[];
  totalReleases: number;
  totalArtworks: number;
  mode: BookletCartMode;
  onRemove: (releaseId: string) => void;
  onCheckout?: () => void;
  statusText: string;
  quote?: BookletCartQuote | null;
  checkoutIntent?: BookletCartCheckoutIntent | null;
  cycleLockDate?: string | null;
  isValidForCheckout?: boolean;
  isPending?: boolean;
};

export function BookletCartUI({
  items,
  totalReleases,
  totalArtworks,
  mode,
  onRemove,
  onCheckout,
  statusText,
  quote,
  checkoutIntent,
  cycleLockDate,
  isValidForCheckout,
  isPending,
}: BookletCartUIProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  };

  const lockDateFormatted = cycleLockDate
    ? new Date(cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  const showEmpty = totalReleases === 0;

  const headerText = useMemo(() => {
    if (mode === "anon") {
      return `${totalArtworks} pages from ${totalReleases} ${totalReleases === 1 ? "release" : "releases"}`;
    }
    return `${totalArtworks} pages from ${totalReleases} releases`;
  }, [mode, totalArtworks, totalReleases]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 border-l border-beige-200 bg-paper/95 backdrop-blur-sm p-4 flex-col gap-3 overflow-y-auto">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink/50">
          Booklet Builder
        </h2>
        <p className="text-sm text-ink/80">{headerText}</p>
        <p className="text-xs text-ink/60">{statusText}</p>

        {showEmpty ? (
          <div className="flex-1 flex items-center justify-center text-xs text-ink/40">
            Your booklet is empty
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.releaseId}
                className="rounded border border-beige-200 bg-white p-2"
              >
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="text-xs text-ink/60">
                  {item.creatorDisplayName} · {item.artworkCount}{" "}
                  {item.artworkCount === 1 ? "page" : "pages"}
                </p>
                {item.source && (
                  <p className="text-[11px] text-ink/50 mt-0.5">
                    {item.source === "AUTO_SUBSCRIPTION"
                      ? "Auto-added from subscription"
                      : "Manually added"}
                  </p>
                )}
                <div className="mt-2 flex items-center text-xs">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onRemove(item.releaseId)}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {quote && (
          <div className="border-t border-beige-200 pt-3 space-y-1">
            <div className="flex justify-between text-xs text-ink/70">
              <span>Production</span>
              <span>{formatCurrency(quote.baseAmount, quote.currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-ink/70">
              <span>Shipping</span>
              <span>
                {formatCurrency(quote.shippingAmount, quote.currency)}
              </span>
            </div>
            {quote.markupAmount > 0 && (
              <div className="flex justify-between text-xs text-ink/70">
                <span>Platform fee</span>
                <span>
                  {formatCurrency(quote.markupAmount, quote.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs text-ink/70">
              <span>Tax</span>
              <span>{formatCurrency(quote.taxAmount, quote.currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-ink pt-1 border-t border-beige-100">
              <span>{quote.isFrozen ? "Locked total" : "Estimated total"}</span>
              <span>{formatCurrency(quote.totalEstimate, quote.currency)}</span>
            </div>
            {!quote.isFrozen && (
              <p className="text-[11px] text-ink/50">
                Final price is locked at cycle end based on your selections and
                delivery address.
              </p>
            )}
          </div>
        )}

        {checkoutIntent && (
          <div className="rounded bg-green-50 border border-green-200 p-2 text-xs text-green-800">
            Booklet committed{" "}
            {lockDateFormatted && `— charged on ${lockDateFormatted}`}
          </div>
        )}

        {mode === "anon" ? (
          <Link
            href="/auth/sign-in?redirect=/browse"
            className="mt-auto rounded px-3 py-2 text-center text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700"
          >
            Sign up to subscribe
          </Link>
        ) : (
          onCheckout && (
            <button
              type="button"
              disabled={isPending || !isValidForCheckout}
              onClick={onCheckout}
              className={`mt-auto rounded px-3 py-2 text-center text-sm font-semibold ${
                isValidForCheckout
                  ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                  : "bg-neutral-300 text-neutral-600 cursor-not-allowed"
              }`}
            >
              {checkoutIntent
                ? "Update — go to checkout"
                : "Commit booklet — you'll be charged when the cycle closes"}
            </button>
          )
        )}
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
                  Booklet builder · {totalReleases}{" "}
                  {totalReleases === 1 ? "release" : "releases"}
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
            {items.length === 0 ? (
              <p className="text-sm text-ink/40 py-4 text-center">
                Your booklet is empty
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.releaseId}
                  className="rounded border border-beige-200 bg-white p-2"
                >
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="text-xs text-ink/60">
                    {item.creatorDisplayName} · {item.artworkCount}{" "}
                    {item.artworkCount === 1 ? "page" : "pages"}
                  </p>
                  {item.source && (
                    <p className="text-[11px] text-ink/50 mt-0.5">
                      {item.source === "AUTO_SUBSCRIPTION"
                        ? "Auto-added from subscription"
                        : "Manually added"}
                    </p>
                  )}
                  <div className="mt-2 flex items-center text-xs">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onRemove(item.releaseId)}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}

            {quote && (
              <div className="border-t border-beige-200 pt-2 space-y-1">
                <div className="flex justify-between text-xs text-ink/70">
                  <span>Production</span>
                  <span>
                    {formatCurrency(quote.baseAmount, quote.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-ink/70">
                  <span>Shipping</span>
                  <span>
                    {formatCurrency(quote.shippingAmount, quote.currency)}
                  </span>
                </div>
                {quote.markupAmount > 0 && (
                  <div className="flex justify-between text-xs text-ink/70">
                    <span>Platform fee</span>
                    <span>
                      {formatCurrency(quote.markupAmount, quote.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-ink/70">
                  <span>Tax</span>
                  <span>{formatCurrency(quote.taxAmount, quote.currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-ink pt-1 border-t border-beige-100">
                  <span>
                    {quote.isFrozen ? "Locked total" : "Estimated total"}
                  </span>
                  <span>
                    {formatCurrency(quote.totalEstimate, quote.currency)}
                  </span>
                </div>
                {!quote.isFrozen && (
                  <p className="text-[11px] text-ink/50">
                    Final price is locked at cycle end based on your selections
                    and delivery address.
                  </p>
                )}
              </div>
            )}

            {checkoutIntent && (
              <div className="rounded bg-green-50 border border-green-200 p-2 text-xs text-green-800">
                Booklet committed{" "}
                {lockDateFormatted && `— charged on ${lockDateFormatted}`}
              </div>
            )}

            {mode === "anon" ? (
              <Link
                href="/auth/sign-in?redirect=/browse"
                className="block w-full rounded px-3 py-2 text-center text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700"
              >
                Sign up to subscribe
              </Link>
            ) : (
              onCheckout && (
                <button
                  type="button"
                  disabled={isPending || !isValidForCheckout}
                  onClick={onCheckout}
                  className={`block w-full rounded px-3 py-2 text-center text-sm font-semibold ${
                    isValidForCheckout
                      ? "bg-fuchsia-600 text-white"
                      : "bg-neutral-300 text-neutral-600"
                  }`}
                >
                  {checkoutIntent
                    ? "Update — go to checkout"
                    : "Commit booklet — you'll be charged when the cycle closes"}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}
