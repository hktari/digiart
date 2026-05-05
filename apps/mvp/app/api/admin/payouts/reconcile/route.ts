// REST endpoint for external/automated reconciliation (e.g. Railway cron job).
// The admin UI uses server actions (lib/actions/payout-actions.ts) instead.
// Keep this route for future automation: POST { cycleId } with admin credentials.
import { NextResponse } from "next/server";
import { z } from "zod";
import { reconcilePayPalPayoutsForCycle } from "@/lib/billing/paypal-reconciliation-service";
import { requireAdmin } from "@/lib/roles";

const reconcileSchema = z.object({
  cycleId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const result = reconcileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      );
    }

    const reconcileResult = await reconcilePayPalPayoutsForCycle(
      result.data.cycleId,
    );

    return NextResponse.json({
      success: reconcileResult.errors.length === 0,
      checked: reconcileResult.checked,
      updated: reconcileResult.updated,
      errors: reconcileResult.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
