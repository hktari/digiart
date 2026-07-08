"use client";

import { BellRing, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { requestOrderingNotify } from "@/lib/actions/collector";

/**
 * Shown on the checkout page while paid ordering is paused. Keeps the collector
 * in the funnel and turns their intent into a demand signal via
 * `requestOrderingNotify` (PostHog event + person property + durable LeadEvent).
 */
export function OrderingPausedPanel({
  quotedPrice,
  currency,
}: {
  quotedPrice: number | null;
  currency: string | null;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  const handleNotify = async () => {
    setState("loading");
    const result = await requestOrderingNotify({
      quotedPrice: quotedPrice ?? undefined,
      currency: currency ?? undefined,
    });
    setState(result.success ? "done" : "error");
  };

  const formattedPrice =
    quotedPrice != null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency || "EUR",
        }).format(quotedPrice)
      : null;

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <BellRing className="h-6 w-6 text-primary" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Printing opens soon
        </h2>
        <p className="text-sm text-muted-foreground/70">
          We&apos;re not taking orders just yet. Keep following your favourite
          creators and building your booklet — you&apos;ll be first in line when
          ordering opens.
        </p>
      </div>

      {formattedPrice && (
        <p className="text-sm text-muted-foreground/60">
          Your current selection would be{" "}
          <span className="font-medium text-foreground">{formattedPrice}</span>.
        </p>
      )}

      {state === "done" ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-success-border bg-success-bg px-4 py-3 text-sm font-medium text-success-foreground">
          <Check className="h-4 w-4" />
          We&apos;ll email you the moment it opens.
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleNotify}
            disabled={state === "loading"}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {state === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              "Notify me when ordering opens"
            )}
          </button>
          {state === "error" && (
            <p className="text-xs text-destructive-foreground">
              Something went wrong. Please try again.
            </p>
          )}
        </>
      )}
    </div>
  );
}
