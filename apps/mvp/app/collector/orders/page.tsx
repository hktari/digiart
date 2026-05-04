import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CollectorOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!collectorProfile) {
    redirect("/collector/setup");
  }

  const billingRecords = await db.billingRecord.findMany({
    where: { collectorProfileId: collectorProfile.id },
    include: {
      cycle: { select: { label: true, lockDate: true } },
      quoteSnapshot: {
        select: { isFrozen: true, totalEstimate: true, currency: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const fulfillmentOrders = await db.fulfillmentOrder.findMany({
    where: { collectorProfileId: collectorProfile.id },
    include: {
      cycle: { select: { label: true } },
      generatedPrintFile: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusTimeline = [
    "Quote frozen",
    "Charge pending",
    "Charge paid",
    "Generating",
    "Processing",
    "Shipped",
    "Delivered",
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-ink mb-6">My Orders</h1>

      {billingRecords.length === 0 && fulfillmentOrders.length === 0 && (
        <p className="text-ink/60">No orders yet.</p>
      )}

      <div className="space-y-6">
        {billingRecords.map((record) => {
          const fulfillment = fulfillmentOrders.find(
            (f) => f.cycleId === record.cycleId,
          );

          const currentStep = (() => {
            if (!record.quoteSnapshot?.isFrozen) return 0;
            if (record.status === "PENDING") return 1;
            if (record.status === "PAID") {
              if (!fulfillment) return 2;
              const pf = fulfillment.generatedPrintFile;
              if (pf?.status === "PENDING" || pf?.status === "GENERATING")
                return 3;
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
          })();

          return (
            <div
              key={record.id}
              className="rounded border border-beige-200 bg-white p-4"
            >
              <h2 className="font-semibold text-ink">{record.cycle.label}</h2>
              <p className="text-sm text-ink/60">
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
                            : "bg-beige-200"
                      }`}
                    />
                    <span className="text-[10px] text-ink/50 hidden sm:inline">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {record.status === "FAILED" && (
                <p className="mt-2 text-sm text-red-600">
                  Payment failed
                  {record.errorMessage && `: ${record.errorMessage}`}
                </p>
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
    </div>
  );
}
