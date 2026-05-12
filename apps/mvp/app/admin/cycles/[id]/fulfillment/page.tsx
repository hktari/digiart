import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminCycleFulfillmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const { id: cycleId } = await params;

  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    notFound();
  }

  const billingRecords = await db.billingRecord.findMany({
    where: { cycleId },
    include: {
      collectorProfile: {
        select: {
          id: true,
          displayName: true,
          shippingCountry: true,
          user: { select: { email: true } },
        },
      },
      quoteSnapshot: {
        select: {
          isFrozen: true,
          totalEstimate: true,
          currency: true,
          requestedPageCount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const fulfillmentOrders = await db.fulfillmentOrder.findMany({
    where: { cycleId },
    include: {
      generatedPrintFile: { select: { status: true } },
    },
  });

  const summary = {
    total: billingRecords.length,
    frozen: billingRecords.filter((r) => r.quoteSnapshot?.isFrozen).length,
    paid: billingRecords.filter((r) => r.status === "PAID").length,
    failed: billingRecords.filter((r) => r.status === "FAILED").length,
    pending: billingRecords.filter((r) => r.status === "PENDING").length,
    shipped: fulfillmentOrders.filter((f) => f.status === "SHIPPED").length,
    delivered: fulfillmentOrders.filter((f) => f.status === "DELIVERED").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foregroundmb-2">
        Fulfillment — {cycle.label}
      </h1>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {[
          ["Total", summary.total],
          ["Frozen", summary.frozen],
          ["Paid", summary.paid],
          ["Failed", summary.failed],
          ["Pending", summary.pending],
          ["Shipped", summary.shipped],
        ].map(([label, count]) => (
          <div
            key={label}
            className="rounded border border-beige-200 bg-white p-3 text-center"
          >
            <p className="text-2xl font-bold text-foreground>{count}</p>
            <p className="text-xs text-muted-foreground/60">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-beige-200 text-left">
              <th className="py-2 pr-4 font-medium text-muted-foreground/60">Collector</th>
              <th className="py-2 pr-4 font-medium text-muted-foreground/60">Country</th>
              <th className="py-2 pr-4 font-medium text-muted-foreground/60">Pages</th>
              <th className="py-2 pr-4 font-medium text-muted-foreground/60">Quote</th>
              <th className="py-2 pr-4 font-medium text-muted-foreground/60">Billing</th>
              <th className="py-2 pr-4 font-medium text-muted-foreground/60">PDF</th>
              <th className="py-2 pr-4 font-medium text-muted-foreground/60">POD</th>
            </tr>
          </thead>
          <tbody>
            {billingRecords.map((record) => {
              const fulfillment = fulfillmentOrders.find(
                (f) => f.collectorProfileId === record.collectorProfileId,
              );

              return (
                <tr
                  key={record.id}
                  className="border-b border-beige-100 hover:bg-beige-50"
                >
                  <td className="py-2 pr-4">
                    <p className="font-medium text-foreground>
                      {record.collectorProfile.displayName ||
                        record.collectorProfile.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground/50">
                      {record.collectorProfile.user.email}
                    </p>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground/70">
                    {record.collectorProfile.shippingCountry || "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground/70">
                    {record.quoteSnapshot?.requestedPageCount ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {record.quoteSnapshot ? (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          record.quoteSnapshot.isFrozen
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {record.quoteSnapshot.isFrozen ? "Frozen" : "Estimate"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        record.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : record.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : record.status === "CANCELED"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {fulfillment?.generatedPrintFile ? (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          fulfillment.generatedPrintFile.status === "READY"
                            ? "bg-green-100 text-green-700"
                            : fulfillment.generatedPrintFile.status === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {fulfillment.generatedPrintFile.status}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {fulfillment ? (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          fulfillment.status === "SHIPPED" ||
                          fulfillment.status === "DELIVERED"
                            ? "bg-green-100 text-green-700"
                            : fulfillment.status === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {fulfillment.status}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
