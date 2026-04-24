import { db } from "@/lib/db";
import { peechoClient } from "./client";

export async function syncPeechoOfferings(): Promise<{
  success: boolean;
  syncedCount?: number;
  error?: string;
}> {
  try {
    let providerConfig = await db.podProviderConfig.findFirst({
      where: { provider: "Peecho" },
    });

    if (!providerConfig) {
      providerConfig = await db.podProviderConfig.create({
        data: {
          provider: "Peecho",
          environment:
            process.env.PEECHO_ENVIRONMENT === "PRODUCTION"
              ? "PRODUCTION"
              : "SANDBOX",
          isActive: true,
        },
      });
    }

    const offerings = await peechoClient.getOfferings();

    for (const offering of offerings) {
      await db.podOffering.upsert({
        where: {
          providerId_externalId: {
            providerId: providerConfig.id,
            externalId: offering.id,
          },
        },
        create: {
          providerId: providerConfig.id,
          externalId: offering.id,
          name: offering.name,
          minPages: offering.min_pages,
          maxPages: offering.max_pages,
          widthMm: offering.width_mm,
          heightMm: offering.height_mm,
          pricingMeta: offering.pricing as object,
          isActive: true,
          syncedAt: new Date(),
        },
        update: {
          name: offering.name,
          minPages: offering.min_pages,
          maxPages: offering.max_pages,
          widthMm: offering.width_mm,
          heightMm: offering.height_mm,
          pricingMeta: offering.pricing as object,
          syncedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      syncedCount: offerings.length,
    };
  } catch (error) {
    console.error("Failed to sync Peecho offerings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
