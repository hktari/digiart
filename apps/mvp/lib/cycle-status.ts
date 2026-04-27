import type { CycleStatus, SubscriptionCycle } from "@prisma/client";
import { db } from "@/lib/db";

export function computeCycleStatus(cycle: SubscriptionCycle): CycleStatus {
  const now = new Date();

  if (now < cycle.lockDate) {
    return "OPEN";
  }

  if (now < cycle.fulfillmentDate) {
    return "LOCKED";
  }

  if (cycle.status === "COMPLETE") {
    return "COMPLETE";
  }

  return "PROCESSING";
}

export async function updateCycleStatus(cycleId: string): Promise<CycleStatus> {
  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    throw new Error("Cycle not found");
  }

  const computedStatus = computeCycleStatus(cycle);

  if (cycle.status !== computedStatus) {
    await db.subscriptionCycle.update({
      where: { id: cycleId },
      data: { status: computedStatus },
    });
  }

  return computedStatus;
}

export async function updateAllCycleStatuses(): Promise<void> {
  const cycles = await db.subscriptionCycle.findMany({
    where: {
      status: {
        not: "COMPLETE",
      },
    },
  });

  for (const cycle of cycles) {
    const computedStatus = computeCycleStatus(cycle);
    if (cycle.status !== computedStatus) {
      await db.subscriptionCycle.update({
        where: { id: cycle.id },
        data: { status: computedStatus },
      });
    }
  }
}

export async function manuallySetCycleStatus(
  cycleId: string,
  status: CycleStatus,
): Promise<void> {
  await db.subscriptionCycle.update({
    where: { id: cycleId },
    data: { status },
  });
}
