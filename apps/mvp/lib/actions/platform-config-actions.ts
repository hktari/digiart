"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

const platformConfigSchema = z.object({
  quoteMarginAmount: z.number().min(0).max(1),
  creatorPayoutSplit: z.number().min(0).max(1),
  platformFeeSplit: z.number().min(0).max(1),
  maxArtworksPerRelease: z.number().min(1),
  maxReleasesPerCycle: z.number().min(1),
});

export async function getPlatformConfig() {
  await requireAdmin();

  const config = await db.platformConfig.findFirst();
  return config;
}

export async function updatePlatformConfig(formData: FormData): Promise<void> {
  await requireAdmin();

  const rawData = {
    quoteMarginAmount: Number.parseFloat(
      formData.get("quoteMarginAmount") as string,
    ),
    creatorPayoutSplit: Number.parseFloat(
      formData.get("creatorPayoutSplit") as string,
    ),
    platformFeeSplit: Number.parseFloat(
      formData.get("platformFeeSplit") as string,
    ),
    maxArtworksPerRelease: Number.parseInt(
      formData.get("maxArtworksPerRelease") as string,
      10,
    ),
    maxReleasesPerCycle: Number.parseInt(
      formData.get("maxReleasesPerCycle") as string,
      10,
    ),
  };

  const result = platformConfigSchema.safeParse(rawData);

  if (!result.success) {
    redirect(
      `/admin/settings?error=${encodeURIComponent(result.error.errors[0].message)}`,
    );
  }

  const splitSum =
    result.data.creatorPayoutSplit + result.data.platformFeeSplit;
  if (Math.abs(splitSum - 1) > 0.001) {
    redirect(
      `/admin/settings?error=${encodeURIComponent("Creator payout split and platform fee split must sum to 1")}`,
    );
  }

  try {
    const existing = await db.platformConfig.findFirst();

    if (existing) {
      await db.platformConfig.update({
        where: { id: existing.id },
        data: result.data,
      });
    } else {
      await db.platformConfig.create({
        data: result.data,
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/creator/releases");
    revalidatePath("/collector/pricing");

    redirect("/admin/settings?success=1");
  } catch (_error) {
    redirect(
      `/admin/settings?error=${encodeURIComponent("Failed to update platform config")}`,
    );
  }
}
