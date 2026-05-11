"use client";

import { useRouter } from "next/navigation";
import { Suspense, useMemo, useTransition } from "react";
import useSWR from "swr";
import { BookletCartUI } from "@/components/booklet-cart-ui";
import type { CollectorCartSummary } from "@/lib/actions/collector";
import { toggleReleaseSelection } from "@/lib/actions/collector";

export const CART_SUMMARY_KEY = "/api/collector/cart-summary";

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

const fetcher = async (url: string): Promise<CartData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load cart summary");
  return res.json();
};

function statusText(summary: CollectorCartSummary) {
  if (!summary.cycleId) return "No open cycle";
  if (summary.artworksOver > 0)
    return `${summary.artworksOver} pages over target`;
  if (summary.artworksNeeded > 0)
    return `${summary.artworksNeeded} pages still needed`;
  return "Ready for checkout";
}

function CollectorBookletCartInner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { data: summary, isLoading } = useSWR<CartData>(
    CART_SUMMARY_KEY,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    },
  );

  const status = useMemo(
    () => (summary ? statusText(summary) : "Loading..."),
    [summary],
  );

  const removeRelease = (releaseId: string) => {
    if (!summary?.cycleId) return;
    startTransition(async () => {
      await toggleReleaseSelection(releaseId, summary.cycleId as string);
    });
  };

  const handleCommit = () => {
    router.push("/collector/checkout");
  };

  if (isLoading || !summary) return null;

  return (
    <BookletCartUI
      items={summary.selectedReleases}
      totalReleases={summary.totalReleases}
      totalArtworks={summary.totalArtworks}
      mode="auth"
      onRemove={removeRelease}
      onCheckout={handleCommit}
      statusText={status}
      quote={summary.quote}
      checkoutIntent={summary.checkoutIntent}
      cycleLockDate={summary.cycleLockDate}
      isValidForCheckout={summary.isValidForCheckout}
      isPending={isPending}
    />
  );
}

export function CollectorBookletCart() {
  return (
    <Suspense fallback={null}>
      <CollectorBookletCartInner />
    </Suspense>
  );
}
