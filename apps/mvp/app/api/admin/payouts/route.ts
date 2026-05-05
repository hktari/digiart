// REST endpoint for external/automated payout triggering (e.g. Railway cron job).
// The admin UI uses server actions (lib/actions/payout-actions.ts) instead.
// Keep this route for future automation: POST { cycleId } with admin credentials.
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendCreatorPayoutsForCycle } from "@/lib/billing/paypal-service";
import { requireAdmin } from "@/lib/roles";

const payoutSchema = z.object({
  cycleId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const result = payoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      );
    }

    const payoutResult = await sendCreatorPayoutsForCycle(result.data.cycleId);

    return NextResponse.json({
      success: payoutResult.errors.length === 0,
      sent: payoutResult.sent,
      failed: payoutResult.failed,
      batchId: payoutResult.batchId,
      errors: payoutResult.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
