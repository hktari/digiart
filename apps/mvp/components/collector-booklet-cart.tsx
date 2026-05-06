"use client";

import { useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { BookletCartUI } from "@/components/booklet-cart-ui";
import type { CollectorCartSummary } from "@/lib/actions/collector";
import { toggleReleaseSelection } from "@/lib/actions/collector";
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
  const router = useRouter();
  const [summary, setSummary] = useState<CartData | null>(null);
  const [isPending, startTransition] = useTransition();

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
    router.push("/collector/checkout");
  };

  if (!summary) return null;

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
