"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

const constraintSchema = z
  .object({
    minPages: z.number().min(1, "Minimum pages must be at least 1"),
    maxPages: z.number().min(1, "Maximum pages must be at least 1"),
    maxCreators: z.number().optional(),
    maxReleases: z.number().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.minPages < data.maxPages, {
    message: "Minimum pages must be less than maximum pages",
    path: ["minPages"],
  });

export async function createConstraint(formData: FormData) {
  await requireAdmin();

  const rawData = {
    minPages: Number.parseInt(formData.get("minPages") as string, 10),
    maxPages: Number.parseInt(formData.get("maxPages") as string, 10),
    maxCreators: formData.get("maxCreators")
      ? Number.parseInt(formData.get("maxCreators") as string, 10)
      : undefined,
    maxReleases: formData.get("maxReleases")
      ? Number.parseInt(formData.get("maxReleases") as string, 10)
      : undefined,
    isActive: formData.get("isActive") === "true",
  };

  const result = constraintSchema.safeParse(rawData);

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  try {
    if (result.data.isActive) {
      await db.bookletConstraint.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const latestVersion = await db.bookletConstraint.findFirst({
      orderBy: { version: "desc" },
    });

    const constraint = await db.bookletConstraint.create({
      data: {
        ...result.data,
        version: (latestVersion?.version ?? 0) + 1,
      },
    });

    revalidatePath("/admin/booklet-constraints");
    return { success: true, constraint };
  } catch (_error) {
    return { error: "Failed to create constraint" };
  }
}

export async function updateConstraint(id: string, formData: FormData) {
  await requireAdmin();

  const rawData = {
    minPages: Number.parseInt(formData.get("minPages") as string, 10),
    maxPages: Number.parseInt(formData.get("maxPages") as string, 10),
    maxCreators: formData.get("maxCreators")
      ? Number.parseInt(formData.get("maxCreators") as string, 10)
      : undefined,
    maxReleases: formData.get("maxReleases")
      ? Number.parseInt(formData.get("maxReleases") as string, 10)
      : undefined,
    isActive: formData.get("isActive") === "true",
  };

  const result = constraintSchema.safeParse(rawData);

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  try {
    if (result.data.isActive) {
      await db.bookletConstraint.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    const constraint = await db.bookletConstraint.update({
      where: { id },
      data: result.data,
    });

    revalidatePath("/admin/booklet-constraints");
    return { success: true, constraint };
  } catch (_error) {
    return { error: "Failed to update constraint" };
  }
}

export async function deleteConstraint(id: string) {
  await requireAdmin();

  try {
    await db.bookletConstraint.delete({
      where: { id },
    });

    revalidatePath("/admin/booklet-constraints");
    return { success: true };
  } catch (_error) {
    return { error: "Failed to delete constraint" };
  }
}

export async function toggleConstraintActive(id: string) {
  await requireAdmin();

  try {
    const constraint = await db.bookletConstraint.findUnique({
      where: { id },
    });

    if (!constraint) {
      return { error: "Constraint not found" };
    }

    if (!constraint.isActive) {
      await db.bookletConstraint.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const updated = await db.bookletConstraint.update({
      where: { id },
      data: { isActive: !constraint.isActive },
    });

    revalidatePath("/admin/booklet-constraints");
    return { success: true, constraint: updated };
  } catch (_error) {
    return { error: "Failed to toggle constraint" };
  }
}
