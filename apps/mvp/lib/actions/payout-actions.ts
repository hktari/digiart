"use server";

import { revalidatePath } from "next/cache";
import { calculateCreatorEarningsForCycle } from "@/lib/billing/payout-service";
import { reconcilePayPalPayoutsForCycle } from "@/lib/billing/paypal-reconciliation-service";
import { sendCreatorPayoutsForCycle } from "@/lib/billing/paypal-service";
import { requireAdmin } from "@/lib/roles";

export type PayoutActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function calculatePayoutsAction(
  cycleId: string,
): Promise<PayoutActionResult> {
  await requireAdmin();

  try {
    const result = await calculateCreatorEarningsForCycle(cycleId);
    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/payouts/${cycleId}`);
    return {
      success: true,
      message: `Calculated payouts for ${result.payouts.length} creators. Pool: ${result.totalMarginPool} EUR (${result.fulfilledCollectors}/${result.paidCollectors} collectors fulfilled).`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendPayoutsAction(
  cycleId: string,
): Promise<PayoutActionResult> {
  await requireAdmin();

  try {
    const result = await sendCreatorPayoutsForCycle(cycleId);

    if (result.errors.length > 0 && result.sent === 0) {
      return { success: false, error: result.errors.join("; ") };
    }

    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/payouts/${cycleId}`);
    return {
      success: true,
      message: `Sent ${result.sent} payouts via PayPal (batch: ${result.batchId ?? "n/a"}). Failed: ${result.failed}.${result.errors.length ? ` Warnings: ${result.errors.join("; ")}` : ""}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function reconcilePayoutsAction(
  cycleId: string,
): Promise<PayoutActionResult> {
  await requireAdmin();

  try {
    const result = await reconcilePayPalPayoutsForCycle(cycleId);
    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/payouts/${cycleId}`);
    return {
      success: true,
      message: `Checked ${result.checked} payouts, updated ${result.updated}.${result.errors.length ? ` Errors: ${result.errors.join("; ")}` : ""}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
