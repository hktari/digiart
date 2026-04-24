"use server";

import type { CycleStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

const cycleSchema = z
  .object({
    label: z.string().min(1, "Label is required"),
    month: z.number().min(1).max(12),
    year: z.number().min(2024),
    selectionOpenDate: z.date(),
    lockDate: z.date(),
    fulfillmentDate: z.date(),
    status: z.enum(["OPEN", "LOCKED", "PROCESSING", "COMPLETE"]).optional(),
  })
  .refine((data) => data.selectionOpenDate < data.lockDate, {
    message: "Selection open date must be before lock date",
    path: ["selectionOpenDate"],
  })
  .refine((data) => data.lockDate < data.fulfillmentDate, {
    message: "Lock date must be before fulfillment date",
    path: ["lockDate"],
  });

export async function createCycle(formData: FormData) {
  await requireAdmin();

  const rawData = {
    label: formData.get("label") as string,
    month: Number.parseInt(formData.get("month") as string, 10),
    year: Number.parseInt(formData.get("year") as string, 10),
    selectionOpenDate: new Date(formData.get("selectionOpenDate") as string),
    lockDate: new Date(formData.get("lockDate") as string),
    fulfillmentDate: new Date(formData.get("fulfillmentDate") as string),
  };

  const result = cycleSchema.safeParse(rawData);

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const existing = await db.subscriptionCycle.findUnique({
    where: {
      month_year: {
        month: result.data.month,
        year: result.data.year,
      },
    },
  });

  if (existing) {
    return { error: "A cycle for this month and year already exists" };
  }

  try {
    const cycle = await db.subscriptionCycle.create({
      data: result.data,
    });

    revalidatePath("/admin/cycles");
    return { success: true, cycle };
  } catch (_error) {
    return { error: "Failed to create cycle" };
  }
}

export async function updateCycle(id: string, formData: FormData) {
  await requireAdmin();

  const rawData = {
    label: formData.get("label") as string,
    month: Number.parseInt(formData.get("month") as string, 10),
    year: Number.parseInt(formData.get("year") as string, 10),
    selectionOpenDate: new Date(formData.get("selectionOpenDate") as string),
    lockDate: new Date(formData.get("lockDate") as string),
    fulfillmentDate: new Date(formData.get("fulfillmentDate") as string),
    status: formData.get("status") as CycleStatus | undefined,
  };

  const result = cycleSchema.safeParse(rawData);

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const existing = await db.subscriptionCycle.findFirst({
    where: {
      month_year: {
        month: result.data.month,
        year: result.data.year,
      },
      id: { not: id },
    },
  });

  if (existing) {
    return { error: "A cycle for this month and year already exists" };
  }

  try {
    const cycle = await db.subscriptionCycle.update({
      where: { id },
      data: result.data,
    });

    revalidatePath("/admin/cycles");
    revalidatePath(`/admin/cycles/${id}`);
    return { success: true, cycle };
  } catch (_error) {
    return { error: "Failed to update cycle" };
  }
}

export async function deleteCycle(id: string) {
  await requireAdmin();

  const cycle = await db.subscriptionCycle.findUnique({
    where: { id },
    include: {
      selections: true,
      releases: true,
    },
  });

  if (!cycle) {
    return { error: "Cycle not found" };
  }

  if (cycle.selections.length > 0 || cycle.releases.length > 0) {
    return {
      error: "Cannot delete cycle with existing selections or releases",
    };
  }

  try {
    await db.subscriptionCycle.delete({
      where: { id },
    });

    revalidatePath("/admin/cycles");
    return { success: true };
  } catch (_error) {
    return { error: "Failed to delete cycle" };
  }
}

export async function updateCycleStatus(id: string, status: CycleStatus) {
  await requireAdmin();

  try {
    const cycle = await db.subscriptionCycle.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/admin/cycles");
    revalidatePath(`/admin/cycles/${id}`);
    return { success: true, cycle };
  } catch (_error) {
    return { error: "Failed to update cycle status" };
  }
}
