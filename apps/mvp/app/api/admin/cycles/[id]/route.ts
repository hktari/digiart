import type { CycleStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

const cycleUpdateSchema = z.object({
  label: z.string().min(1).optional(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2024).optional(),
  selectionOpenDate: z.string().datetime().optional(),
  lockDate: z.string().datetime().optional(),
  fulfillmentDate: z.string().datetime().optional(),
  status: z.enum(["OPEN", "LOCKED", "PROCESSING", "COMPLETE"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    const cycle = await db.subscriptionCycle.findUnique({
      where: { id: params.id },
      include: {
        releases: { include: { creatorProfile: true } },
        selections: { include: { collectorProfile: true } },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    return NextResponse.json(cycle);
  } catch (_error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const result = cycleUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (result.data.label) updateData.label = result.data.label;
    if (result.data.month) updateData.month = result.data.month;
    if (result.data.year) updateData.year = result.data.year;
    if (result.data.selectionOpenDate) {
      updateData.selectionOpenDate = new Date(result.data.selectionOpenDate);
    }
    if (result.data.lockDate) {
      updateData.lockDate = new Date(result.data.lockDate);
    }
    if (result.data.fulfillmentDate) {
      updateData.fulfillmentDate = new Date(result.data.fulfillmentDate);
    }
    if (result.data.status) {
      updateData.status = result.data.status as CycleStatus;
    }

    const cycle = await db.subscriptionCycle.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(cycle);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to update cycle" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    const cycle = await db.subscriptionCycle.findUnique({
      where: { id: params.id },
      include: {
        selections: true,
        releases: true,
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (cycle.selections.length > 0 || cycle.releases.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete cycle with existing selections or releases" },
        { status: 400 },
      );
    }

    await db.subscriptionCycle.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to delete cycle" },
      { status: 500 },
    );
  }
}
