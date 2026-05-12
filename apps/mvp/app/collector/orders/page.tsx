import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CollectorOrdersClient } from "./collector-orders-client";

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

  const formattedBillingRecords = billingRecords.map((record) => ({
    ...record,
    cycle: {
      ...record.cycle,
      lockDate: record.cycle.lockDate.toISOString(),
    },
    quoteSnapshot: record.quoteSnapshot
      ? {
          ...record.quoteSnapshot,
          totalEstimate: Number(record.quoteSnapshot.totalEstimate),
        }
      : null,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foregroundmb-6">My Orders</h1>

      <CollectorOrdersClient
        billingRecords={formattedBillingRecords}
        fulfillmentOrders={fulfillmentOrders}
      />
    </div>
  );
}
