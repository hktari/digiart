import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function AdminOrdersPage() {
  await requireAdmin();

  const billingRecords = await db.billingRecord.findMany({
    include: {
      collectorProfile: {
        select: {
          id: true,
          displayName: true,
          shippingCountry: true,
          user: { select: { email: true } },
        },
      },
      cycle: { select: { id: true, label: true } },
      quoteSnapshot: {
        select: { isFrozen: true, totalEstimate: true, currency: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const fulfillmentOrders = await db.fulfillmentOrder.findMany({
    select: {
      collectorProfileId: true,
      cycleId: true,
      status: true,
      trackingNumber: true,
      trackingUrl: true,
      generatedPrintFile: { select: { status: true } },
    },
  });

  const fulfillmentMap = new Map(
    fulfillmentOrders.map((f) => [`${f.collectorProfileId}:${f.cycleId}`, f]),
  );

  const summary = {
    total: billingRecords.length,
    paid: billingRecords.filter((r) => r.status === "PAID").length,
    pending: billingRecords.filter((r) => r.status === "PENDING").length,
    failed: billingRecords.filter((r) => r.status === "FAILED").length,
    shipped: fulfillmentOrders.filter((f) => f.status === "SHIPPED").length,
    delivered: fulfillmentOrders.filter((f) => f.status === "DELIVERED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Billing records and fulfillment status across all cycles
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {(
          [
            ["Total", summary.total],
            ["Paid", summary.paid],
            ["Pending", summary.pending],
            ["Failed", summary.failed],
            ["Shipped", summary.shipped],
            ["Delivered", summary.delivered],
          ] as [string, number][]
        ).map(([label, count]) => (
          <div
            key={label}
            className="rounded border border-border bg-card p-3 text-center"
          >
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="border-b border-border text-left">
              <th className="py-2 px-4 font-medium text-muted-foreground">
                Collector
              </th>
              <th className="py-2 px-4 font-medium text-muted-foreground">
                Cycle
              </th>
              <th className="py-2 px-4 font-medium text-muted-foreground">
                Country
              </th>
              <th className="py-2 px-4 font-medium text-muted-foreground">
                Amount
              </th>
              <th className="py-2 px-4 font-medium text-muted-foreground">
                Billing
              </th>
              <th className="py-2 px-4 font-medium text-muted-foreground">
                PDF
              </th>
              <th className="py-2 px-4 font-medium text-muted-foreground">
                Fulfillment
              </th>
              <th className="py-2 px-4 font-medium text-muted-foreground">
                Tracking
              </th>
            </tr>
          </thead>
          <tbody>
            {billingRecords.map((record) => {
              const fulfillment = fulfillmentMap.get(
                `${record.collectorProfileId}:${record.cycleId}`,
              );

              return (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="py-2 px-4">
                    <p className="font-medium text-foreground">
                      {record.collectorProfile.displayName ||
                        record.collectorProfile.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.collectorProfile.user.email}
                    </p>
                  </td>
                  <td className="py-2 px-4 text-muted-foreground">
                    {record.cycle.label}
                  </td>
                  <td className="py-2 px-4 text-muted-foreground">
                    {record.collectorProfile.shippingCountry || "—"}
                  </td>
                  <td className="py-2 px-4 text-foreground">
                    {record.quoteSnapshot
                      ? `${Number(record.quoteSnapshot.totalEstimate).toFixed(2)} ${record.quoteSnapshot.currency}`
                      : `${Number(record.amount).toFixed(2)} ${record.currency}`}
                  </td>
                  <td className="py-2 px-4">
                    <BillingBadge status={record.status} />
                  </td>
                  <td className="py-2 px-4">
                    {fulfillment?.generatedPrintFile ? (
                      <StatusBadge
                        status={fulfillment.generatedPrintFile.status}
                        variant="pdf"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    {fulfillment ? (
                      <StatusBadge
                        status={fulfillment.status}
                        variant="fulfillment"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    {fulfillment?.trackingUrl ? (
                      <a
                        href={fulfillment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-fuchsia-600 hover:underline"
                      >
                        {fulfillment.trackingNumber ?? "Track"}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {billingRecords.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingBadge({ status }: { status: string }) {
  const classes =
    status === "PAID"
      ? "bg-success-bg text-success-foreground border border-success-border"
      : status === "FAILED"
        ? "bg-destructive-bg text-destructive-foreground border border-destructive-border"
        : status === "CANCELED"
          ? "bg-muted text-muted-foreground border border-border"
          : "bg-warning-bg text-warning-foreground border border-warning-border";

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${classes}`}>
      {status}
    </span>
  );
}

function StatusBadge({
  status,
  variant,
}: {
  status: string;
  variant: "pdf" | "fulfillment";
}) {
  const isGood =
    variant === "pdf"
      ? status === "READY"
      : status === "SHIPPED" || status === "DELIVERED";
  const isBad = status === "FAILED";

  const classes = isBad
    ? "bg-destructive-bg text-destructive-foreground border border-destructive-border"
    : isGood
      ? "bg-success-bg text-success-foreground border border-success-border"
      : "bg-warning-bg text-warning-foreground border border-warning-border";

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${classes}`}>
      {status}
    </span>
  );
}
