"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Package,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { OrderPricing } from "@/lib/actions/pricing-actions";
import { refreshCommittedOrder } from "@/lib/actions/pricing-actions";

interface PricingQuoteDisplayProps {
  committed: true;
  initialPricing: OrderPricing;
  cycleLockDate: string | null;
  totalReleases: number;
  totalPages: number;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

export function PricingQuoteDisplay({
  initialPricing,
  cycleLockDate,
  totalReleases,
  totalPages,
}: PricingQuoteDisplayProps) {
  const [pricing, setPricing] = useState<OrderPricing>(initialPricing);
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    setJustRefreshed(false);

    const result = await refreshCommittedOrder();

    setIsRefreshing(false);

    if ("error" in result) {
      setError(result.error);
    } else {
      setPricing(result.pricing);
      setJustRefreshed(true);
    }
  };

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

      {/* Amount due */}
      <div className="rounded-lg border border-beige-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/50">
              Amount due at cycle lock
            </p>
            <p className="text-3xl font-bold text-ink mt-1">
              {fmt(pricing.retailTotalAmount, pricing.currency)}
            </p>
          </div>
          {justRefreshed && (
            <span className="flex items-center gap-1 text-xs text-jade-700 bg-jade-50 border border-jade-200 rounded px-2 py-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Updated
            </span>
          )}
        </div>

        {/* Breakdown */}
        <div className="space-y-2 border-t border-beige-100 pt-4">
          <div className="flex justify-between text-sm text-ink/70">
            <span>Production (wholesale)</span>
            <span>{fmt(pricing.wholesaleTotalAmount, pricing.currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-ink/70">
            <span>Platform & creator margin</span>
            <span>{fmt(pricing.platformMarkupAmount, pricing.currency)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-ink border-t border-beige-100 pt-2 mt-1">
            <span>Total</span>
            <span>{fmt(pricing.retailTotalAmount, pricing.currency)}</span>
          </div>
        </div>

        <p className="text-xs text-ink/50 mt-3">
          Last calculated:{" "}
          {new Date(pricing.updatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}
          Order #{pricing.peechoOrderId}
        </p>
      </div>

      {/* Selections summary */}
      <div className="rounded-lg border border-beige-200 bg-white p-4 flex items-center gap-3">
        <Package className="h-5 w-5 text-ink/40 shrink-0" />
        <div className="text-sm text-ink/70">
          <span className="font-medium text-ink">{totalReleases}</span> release
          {totalReleases !== 1 ? "s" : ""} ·{" "}
          <span className="font-medium text-ink">{pricing.pageCount}</span>{" "}
          pages
          {pricing.pageCount !== totalPages && (
            <span className="text-amber-600">
              {" "}
              (selections changed — recalculate below)
            </span>
          )}
        </div>
      </div>

      {/* Dynamic pricing notice */}
      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Price changes with your selections</p>
        <p className="text-xs">
          Adding or removing releases before {lockDate ?? "cycle lock"} will
          change the amount due. Use the button below to recalculate after
          making changes.
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
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="w-full rounded-lg border border-beige-200 bg-white px-4 py-3 text-sm font-medium text-ink/70 hover:bg-beige-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
