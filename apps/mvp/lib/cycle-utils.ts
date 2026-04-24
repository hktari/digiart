import type { CycleStatus, SubscriptionCycle } from "@prisma/client";
import { db } from "@/lib/db";
import { computeCycleStatus } from "@/lib/cycle-status";

export async function getCurrentCycle(): Promise<SubscriptionCycle | null> {
  const now = new Date();
  
  const cycle = await db.subscriptionCycle.findFirst({
    where: {
      selectionOpenDate: { lte: now },
      fulfillmentDate: { gte: now },
    },
    orderBy: { selectionOpenDate: "desc" },
  });
  
  if (!cycle) {
    return null;
  }
  
  const computedStatus = computeCycleStatus(cycle);
  
  if (cycle.status !== computedStatus) {
    return await db.subscriptionCycle.update({
      where: { id: cycle.id },
      data: { status: computedStatus },
    });
  }
  
  return cycle;
}

export async function canEditRelease(cycleId: string | null): Promise<boolean> {
  if (!cycleId) {
    return true;
  }
  
  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
  });
  
  if (!cycle) {
    return false;
  }
  
  const status = computeCycleStatus(cycle);
  return status === "OPEN";
}

export async function canEditSelections(cycleId: string): Promise<boolean> {
  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
  });
  
  if (!cycle) {
    return false;
  }
  
  const status = computeCycleStatus(cycle);
  return status === "OPEN";
}

export function getCycleStatusBadge(status: CycleStatus): {
  label: string;
  color: string;
} {
  switch (status) {
    case "OPEN":
      return { label: "Open", color: "green" };
    case "LOCKED":
      return { label: "Locked", color: "yellow" };
    case "PROCESSING":
      return { label: "Processing", color: "blue" };
    case "COMPLETE":
      return { label: "Complete", color: "gray" };
  }
}

export function getTimeUntilLock(lockDate: Date): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
} {
  const now = new Date();
  const diff = lockDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, isExpired: false };
}
