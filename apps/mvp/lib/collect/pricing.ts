// Demo pricing for the "print your collection as a magazine" CTA.
// This is NOT a live Peecho quote — it's an illustrative price so the pitch
// flow feels real. The production path reuses lib/peecho + the booklet pipeline.

const BASE_PRICE_CENTS = 1200; // cover + binding
const PER_PAGE_CENTS = 150; // one collected piece = one page

/** Illustrative magazine price in cents. Monotonic in item count. */
export function magazinePriceCents(itemCount: number): number {
  const pages = Math.max(0, Math.floor(itemCount));
  return BASE_PRICE_CENTS + pages * PER_PAGE_CENTS;
}

/** Formats a cent amount as a EUR string, e.g. 1800 -> "€18.00". */
export function formatEur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

// Pretend creator earnings: what a creator accrues each time a distinct
// collector collects their work. Display-only for the claim page.
export const EARNINGS_PER_COLLECT_CENTS = 200;

/** Illustrative creator earnings in cents for N distinct collectors. */
export function creatorEarningsCents(distinctCollectors: number): number {
  return (
    Math.max(0, Math.floor(distinctCollectors)) * EARNINGS_PER_COLLECT_CENTS
  );
}
