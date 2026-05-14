import { NextResponse } from "next/server";
import { freezeCollectorCycleQuotes } from "@/lib/billing/freeze-service";
import { triggerPdfGenerationForCycle } from "@/lib/billing/pdf-trigger-service";
import { db } from "@/lib/db";
import { sendPreLockReminders } from "@/lib/notifications/cycle-reminder-service";
import { requireAdmin } from "@/lib/roles";

/**
 * POST /api/admin/cycles/[id]/lock
 *
 * Locks a cycle and kicks off the passive-collector fulfillment pipeline:
 * 1. Sends pre-lock reminder notifications to passive collectors.
 * 2. Triggers PDF generation for passive collectors.
 * 3. Freezes quotes and creates Peecho orders for passive collectors.
 *
 * Active collectors (orderedManually=true) are skipped in steps 2 and 3.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const cycle = await db.subscriptionCycle.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (cycle.status === "COMPLETE") {
      return NextResponse.json(
        { error: "Cycle is already complete" },
        { status: 400 },
      );
    }

    await db.subscriptionCycle.update({
      where: { id },
      data: { status: "LOCKED" },
    });

    const [reminders, pdfResult, freezeResult] = await Promise.all([
      sendPreLockReminders(id),
      triggerPdfGenerationForCycle(id),
      freezeCollectorCycleQuotes(id),
    ]);

    return NextResponse.json({
      success: true,
      cycleId: id,
      reminders,
      pdfGeneration: {
        enqueued: pdfResult.enqueued,
        skipped: pdfResult.skipped.length,
        errors: pdfResult.errors,
      },
      freeze: {
        frozen: freezeResult.frozen,
        ineligible: freezeResult.ineligible,
        errors: freezeResult.errors,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to lock cycle",
      },
      { status: 500 },
    );
  }
}
