"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Info,
  Package,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { fetchLiveQuote } from "@/lib/actions/pricing-actions";

interface PricingEstimateCardProps {
  estimate: {
    baseAmount: number;
    shippingAmount: number;
    markupAmount: number;
    taxAmount: number;
    totalEstimate: number;
    currency: string;
    pageCount: number;
  } | null;
  totalReleases: number;
  totalPages: number;
  cycleLockDate: string | null;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

export function PricingEstimateCard({
  estimate,
  totalReleases,
  totalPages,
  cycleLockDate,
}: PricingEstimateCardProps) {
  const [currentEstimate, setCurrentEstimate] = useState(estimate);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const lockDate = cycleLockDate
    ? new Date(cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleRecalculate = async () => {
    setIsRefreshing(true);
    setError(null);
    setJustRefreshed(false);

    const result = await fetchLiveQuote("", undefined);

    setIsRefreshing(false);

    if ("error" in result && result.error) {
      setError(result.error);
    } else if ("quote" in result && result.quote) {
      setCurrentEstimate({
        baseAmount: result.quote.baseAmount,
        shippingAmount: result.quote.shippingAmount,
        markupAmount: result.quote.markupAmount,
        taxAmount: result.quote.taxAmount,
        totalEstimate: result.quote.totalEstimate,
        currency: result.quote.currency,
        pageCount: result.quote.pageCount,
      });
      setJustRefreshed(true);
    }
  };

  const displayEstimate = currentEstimate ?? estimate;

  return (
    <div className="space-y-4">
      {/* Charge date banner */}
      {lockDate && (
        <div className="rounded-lg border border-jade-200 bg-jade-50 p-4 flex items-start gap-3">
          <Calendar className="h-5 w-5 text-jade-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-jade-800">
              Charge date: {lockDate}
            </p>
            <p className="text-xs text-jade-700 mt-0.5">
              Your card will be charged automatically at cycle lock. No action
              needed.
            </p>
          </div>
        </div>
      )}

      {/* Estimate display */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Estimated amount
            </p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {displayEstimate
                ? formatCurrency(
                    displayEstimate.totalEstimate,
                    displayEstimate.currency,
                  )
                : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {justRefreshed && (
              <span className="flex items-center gap-1 text-xs text-jade-700 bg-jade-50 border border-jade-200 rounded px-2 py-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Updated
              </span>
            )}
            <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Estimate
            </span>
          </div>
        </div>

        {displayEstimate && (
          <div className="space-y-2 border-t border-amber-100 pt-4">
            <div className="flex justify-between text-sm text-muted-foreground/70">
              <span>Production</span>
              <span>
                {formatCurrency(
                  displayEstimate.baseAmount,
                  displayEstimate.currency,
                )}
              </span>
            </div>
            {displayEstimate.shippingAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground/70">
                <span>Shipping</span>
                <span>
                  {formatCurrency(
                    displayEstimate.shippingAmount,
                    displayEstimate.currency,
                  )}
                </span>
              </div>
            )}
            {displayEstimate.markupAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground/70">
                <span>Platform fee</span>
                <span>
                  {formatCurrency(
                    displayEstimate.markupAmount,
                    displayEstimate.currency,
                  )}
                </span>
              </div>
            )}
            {displayEstimate.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground/70">
                <span>Tax</span>
                <span>
                  {formatCurrency(
                    displayEstimate.taxAmount,
                    displayEstimate.currency,
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold text-foreground border-t border-amber-100 pt-2 mt-1">
              <span>Estimated total</span>
              <span>
                {formatCurrency(
                  displayEstimate.totalEstimate,
                  displayEstimate.currency,
                )}
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-3 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            This is an estimate based on your current selections and delivery
            address. The final price may differ slightly; we will email you the
            exact amount before charging.
          </span>
        </p>
      </div>

      {/* Selections summary */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <Package className="h-5 w-5 text-muted-foreground/40 shrink-0" />
        <div className="text-sm text-muted-foreground/70">
          <span className="font-medium text-foreground">{totalReleases}</span>{" "}
          release
          {totalReleases !== 1 ? "s" : ""} ·{" "}
          <span className="font-medium text-foreground">{totalPages}</span>{" "}
          pages
        </div>
      </div>

      {/* Dynamic pricing notice */}
      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Price changes with your selections</p>
        <p className="text-xs">
          Before an order is created, estimates use Peecho&apos;s wholesale
          quote plus our configured margin. The final order price may differ
          slightly; we email the final amount before charging.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleRecalculate}
        disabled={isRefreshing}
        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw
          className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
        />
        {isRefreshing
          ? "Recalculating…"
          : "Recalculate based on current selections"}
      </button>
    </div>
  );
}
