"use client";

import { Lock, Zap } from "lucide-react";
import { useState } from "react";

type BillingRecord = {
  id: string;
  cycleId: string;
  status: string;
  errorMessage: string | null;
  cycle: { label: string; lockDate: string };
  quoteSnapshot: {
    isFrozen: boolean;
    totalEstimate: number;
    currency: string;
  } | null;
  orderMode: "manual" | "auto";
  orderedAt: string | null;
};

type FulfillmentOrder = {
  id: string;
  cycleId: string;
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  generatedPrintFile: { status: string } | null;
};

type CollectorOrdersClientProps = {
  billingRecords: BillingRecord[];
  fulfillmentOrders: FulfillmentOrder[];
};

const statusTimeline = [
  "Order placed",
  "Awaiting charge",
  "Charge paid",
  "Generating",
  "Processing",
  "Shipped",
  "Delivered",
];

function getCurrentStep(
  record: BillingRecord,
  fulfillment: FulfillmentOrder | undefined,
): number {
  if (!record.quoteSnapshot?.isFrozen) return 0;
  if (record.status === "PENDING") return 1;
  if (record.status === "PAID") {
    if (!fulfillment) return 2;
    const pf = fulfillment.generatedPrintFile;
    if (pf?.status === "PENDING" || pf?.status === "GENERATING") return 3;
    if (
      fulfillment.status === "SUBMITTED" ||
      fulfillment.status === "PROCESSING"
    )
      return 4;
    if (fulfillment.status === "SHIPPED") return 5;
    if (fulfillment.status === "DELIVERED") return 6;
    return 2;
  }
  if (record.status === "FAILED") return -1;
  return 0;
}

function DownloadButton({
  cycleId,
  cycleLabel,
}: {
  cycleId: string;
  cycleLabel: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/collector/booklet-download/${cycleId}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link");
      }

      // Create a temporary link and click it to trigger download
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.filename || `booklet-${cycleLabel}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 text-sm text-fuchsia-600 hover:text-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Preparing download...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download PDF
          </>
        )}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function CollectorOrdersClient({
  billingRecords,
  fulfillmentOrders,
}: CollectorOrdersClientProps) {
  if (billingRecords.length === 0 && fulfillmentOrders.length === 0) {
    return <p className="text-muted-foreground/60">No orders yet.</p>;
  }

  return (
    <div className="space-y-6">
      {billingRecords.map((record) => {
        const fulfillment = fulfillmentOrders.find(
          (f) => f.cycleId === record.cycleId,
        );
        const currentStep = getCurrentStep(record, fulfillment);
        const canDownload =
          record.status === "PAID" &&
          fulfillment?.generatedPrintFile?.status === "READY";

        return (
          <div
            key={record.id}
            className="rounded border border-border bg-card p-4"
          >
            <h2 className="font-semibold text-foreground">
              {record.cycle.label}
            </h2>
            <p className="text-sm text-muted-foreground/60">
              {record.quoteSnapshot
                ? `${Number(record.quoteSnapshot.totalEstimate).toFixed(2)} ${record.quoteSnapshot.currency}`
                : "—"}
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {statusTimeline.map((label, i) => (
                <div key={label} className="flex items-center gap-1">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      i < currentStep
                        ? "bg-fuchsia-600"
                        : i === currentStep
                          ? "bg-fuchsia-400 animate-pulse"
                          : "bg-muted-foreground/20"
                    }`}
                  />
                  <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Mode badge */}
            <div className="mt-2">
              {record.orderMode === "manual" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-jade-100 px-2 py-1 text-xs font-medium text-jade-700">
                  <Zap className="h-3 w-3" />
                  Ordered manually
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Auto-fulfilled at lock
                </span>
              )}
            </div>

            {record.status === "FAILED" && (
              <p className="mt-2 text-sm text-red-600">
                Payment failed
                {record.errorMessage && `: ${record.errorMessage}`}
              </p>
            )}

            {canDownload && (
              <DownloadButton
                cycleId={record.cycleId}
                cycleLabel={record.cycle.label}
              />
            )}

            {fulfillment?.trackingUrl && (
              <a
                href={fulfillment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-fuchsia-600 hover:underline"
              >
                Track shipment
                {fulfillment.trackingNumber &&
                  ` (${fulfillment.trackingNumber})`}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
