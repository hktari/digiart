"use client";

import { useState } from "react";

interface QuoteData {
  shippingAmount: number;
  productAmount: number;
  taxAmount: number;
  totalEstimate: number;
  currency: string;
  quotedAt: Date;
}

interface PricingQuoteDisplayProps {
  initialQuote?: QuoteData | null;
  onRefresh: () => Promise<{ error?: string; success?: boolean; quote?: QuoteData }>;
}

export function PricingQuoteDisplay({ initialQuote, onRefresh }: PricingQuoteDisplayProps) {
  const [quote, setQuote] = useState<QuoteData | null>(initialQuote || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    const result = await onRefresh();

    setIsRefreshing(false);

    if (result.error) {
      setError(result.error);
    } else if (result.quote) {
      setQuote(result.quote);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {quote ? (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">Pricing Estimate</h2>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-sm text-fuchsia-600 hover:underline disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh Quote"}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Product Cost:</span>
              <span className="font-medium">
                {formatCurrency(quote.productAmount, quote.currency)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping:</span>
              <span className="font-medium">
                {formatCurrency(quote.shippingAmount, quote.currency)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">
                {formatCurrency(quote.taxAmount, quote.currency)}
              </span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="font-semibold">Total Estimate:</span>
                <span className="text-xl font-bold text-fuchsia-600">
                  {formatCurrency(quote.totalEstimate, quote.currency)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Last updated: {new Date(quote.quotedAt).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No pricing estimate available yet.</p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 disabled:opacity-50"
          >
            {isRefreshing ? "Getting Quote..." : "Get Quote"}
          </button>
        </div>
      )}
    </div>
  );
}
