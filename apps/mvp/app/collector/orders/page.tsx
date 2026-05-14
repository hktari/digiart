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
      cycle: { select: { label: true, lockDate: true, id: true } },
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

  // Fetch checkout intents to determine order mode
  const cycleIds = billingRecords.map((r) => r.cycleId);
  const checkoutIntents =
    cycleIds.length > 0
      ? await db.checkoutIntent.findMany({
          where: {
            collectorProfileId: collectorProfile.id,
            cycleId: { in: cycleIds },
          },
          select: {
            cycleId: true,
            orderedManually: true,
            orderedAt: true,
          },
        })
      : [];

  const checkoutIntentMap = new Map(
    checkoutIntents.map((ci) => [
      ci.cycleId,
      {
        orderedManually: ci.orderedManually,
        orderedAt: ci.orderedAt?.toISOString() ?? null,
      },
    ]),
  );

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
    orderMode: checkoutIntentMap.get(record.cycleId)?.orderedManually
      ? ("manual" as const)
      : ("auto" as const),
    orderedAt: checkoutIntentMap.get(record.cycleId)?.orderedAt ?? null,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Orders</h1>

      <CollectorOrdersClient
        billingRecords={formattedBillingRecords}
        fulfillmentOrders={fulfillmentOrders}
      />
    </div>
  );
}
