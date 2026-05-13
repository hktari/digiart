"use client";

import { useState } from "react";
import {
  calculatePayoutsAction,
  type PayoutActionResult,
  reconcilePayoutsAction,
  sendPayoutsAction,
} from "@/lib/actions/payout-actions";

interface Props {
  cycleId: string;
  hasPendingPayouts: boolean;
  hasSentPayouts: boolean;
  hasCalculation: boolean;
}

export function PayoutActionButtons({
  cycleId,
  hasPendingPayouts,
  hasSentPayouts,
  hasCalculation,
}: Props) {
  const [loading, setLoading] = useState<
    "calculate" | "send" | "reconcile" | null
  >(null);
  const [result, setResult] = useState<PayoutActionResult | null>(null);

  async function run(
    action: "calculate" | "send" | "reconcile",
    fn: () => Promise<PayoutActionResult>,
  ) {
    setLoading(action);
    setResult(null);
    try {
      const res = await fn();
      setResult(res);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() =>
            run("calculate", () => calculatePayoutsAction(cycleId))
          }
          className="px-4 py-2 text-sm font-medium rounded-md bg-beige-100 text-foregroundhover:bg-beige-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === "calculate"
            ? "Calculating…"
            : hasCalculation
              ? "Recalculate"
              : "Calculate Earnings"}
        </button>

        <button
          type="button"
          disabled={loading !== null || !hasPendingPayouts}
          onClick={() => run("send", () => sendPayoutsAction(cycleId))}
          className="px-4 py-2 text-sm font-medium rounded-md bg-jade-600 text-white hover:bg-jade-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === "send" ? "Sending…" : "Send via PayPal"}
        </button>

        <button
          type="button"
          disabled={loading !== null || !hasSentPayouts}
          onClick={() =>
            run("reconcile", () => reconcilePayoutsAction(cycleId))
          }
          className="px-4 py-2 text-sm font-medium rounded-md bg-ocean-100 text-ocean-800 hover:bg-ocean-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === "reconcile" ? "Reconciling…" : "Reconcile PayPal"}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            result.success
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {result.success ? result.message : `Error: ${result.error}`}
        </div>
      )}
    </div>
  );
}
