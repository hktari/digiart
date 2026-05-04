"use server";

import { revalidatePath } from "next/cache";
import { calculateCreatorEarningsForCycle } from "@/lib/billing/payout-service";
import { sendCreatorPayoutsForCycle } from "@/lib/billing/paypal-service";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export type PayoutActionResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string };

export async function calculatePayouts(
  cycleId: string,
): Promise<PayoutActionResult> {
  await requireAdmin();

  try {
    const result = await calculateCreatorEarningsForCycle(cycleId);

    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/payouts/${cycleId}`);

    return {
      success: true,
      data: {
        payouts: result.payouts.length,
        totalMarkupPool: result.totalMarkupPool,
        paidCollectors: result.paidCollectors,
        fulfilledCollectors: result.fulfilledCollectors,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to calculate payouts";
    return { success: false, error: message };
  }
}

export async function sendPayouts(
  cycleId: string,
): Promise<PayoutActionResult> {
  await requireAdmin();

  try {
    const result = await sendCreatorPayoutsForCycle(cycleId);

    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/payouts/${cycleId}`);

    return {
      success: true,
      data: {
        sent: result.sent,
        failed: result.failed,
        batchId: result.batchId,
        errors: result.errors,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send payouts";
    return { success: false, error: message };
  }
}

export async function getCyclePayoutData(cycleId: string) {
  await requireAdmin();

  const [cycle, calculation, payouts] = await Promise.all([
    db.subscriptionCycle.findUnique({
      where: { id: cycleId },
      include: {
        _count: {
          select: {
            releases: true,
            selections: true,
            billingRecords: true,
            fulfillmentOrders: true,
          },
        },
      },
    }),
    db.payoutCalculation.findUnique({ where: { cycleId } }),
    db.creatorPayout.findMany({
      where: { cycleId },
      include: {
        creatorProfile: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            payoutProfile: {
              select: { paypalEmail: true, isReady: true },
            },
          },
        },
      },
      orderBy: { amount: "desc" },
    }),
  ]);

  return { cycle, calculation, payouts };
}

export async function getAllCyclesPayoutSummary() {
  await requireAdmin();

  const cycles = await db.subscriptionCycle.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      payoutCalculations: {
        select: {
          totalMarkupPool: true,
          totalPaidCollectors: true,
          totalFulfilledCollectors: true,
          calculatedAt: true,
        },
      },
      creatorPayouts: {
        select: {
          status: true,
          amount: true,
        },
      },
      _count: {
        select: {
          releases: true,
          selections: true,
          billingRecords: true,
        },
      },
    },
  });

  return cycles;
}
