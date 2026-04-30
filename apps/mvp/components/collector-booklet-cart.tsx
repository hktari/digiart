"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { CollectorCartSummary } from "@/lib/actions/collector";
import { toggleReleaseSelection } from "@/lib/actions/collector";

function statusText(summary: CollectorCartSummary) {
  if (!summary.cycleId) return "No open cycle";
  if (summary.artworksOver > 0) return `${summary.artworksOver} over limit`;
  if (summary.artworksNeeded > 0) return `${summary.artworksNeeded} needed`;
  if (!summary.isValidSubscribedCreatorRange) {
    if (summary.totalSubscribedCreators < summary.minSubscribedCreators) {
      return `${summary.minSubscribedCreators - summary.totalSubscribedCreators} creator subscription${summary.minSubscribedCreators - summary.totalSubscribedCreators === 1 ? "" : "s"} needed`;
    }
    return "Too many creator subscriptions";
  }
  return "Ready for checkout";
}

export function CollectorBookletCart() {
  const _pathname = usePathname();
  const [summary, setSummary] = useState<CollectorCartSummary | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/collector/cart-summary", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as CollectorCartSummary;
      if (!cancelled) setSummary(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const status = useMemo(
    () => (summary ? statusText(summary) : "Loading..."),
    [summary],
  );

  const removeRelease = (releaseId: string) => {
    if (!summary?.cycleId) return;
    startTransition(async () => {
      await toggleReleaseSelection(releaseId, summary.cycleId as string);
      const res = await fetch("/api/collector/cart-summary", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as CollectorCartSummary;
      setSummary(data);
    });
  };

  if (!summary) return null;

  return (
    <>
      <aside className="hidden lg:flex fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 border-l border-beige-200 bg-paper/95 backdrop-blur-sm p-4 flex-col gap-3 overflow-y-auto">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink/50">
          Booklet Cart
        </h2>
        <p className="text-sm text-ink/80">
          {summary.totalArtworks} artworks ({summary.minRequired}-
          {summary.maxAllowed})
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
              <div className="mt-2 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => removeRelease(item.releaseId)}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
                <Link
                  href={`/collector/discover?view=releases`}
                  className="text-ocean-700 hover:text-ocean-800"
                >
                  Replace
                </Link>
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
          <p className="text-sm font-semibold text-ink">
            Booklet cart · {summary.totalArtworks} artworks
          </p>
          <p className="text-xs text-ink/60">{status}</p>
        </button>
        {isOpen && (
          <div className="mt-2 max-h-72 overflow-y-auto space-y-2 pb-2">
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
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => removeRelease(item.releaseId)}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                  <Link
                    href={`/collector/discover?view=releases`}
                    className="text-ocean-700 hover:text-ocean-800"
                  >
                    Replace
                  </Link>
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
