import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
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

    const offerings = await peechoClient.getOfferings({
      categoryFilter: "MA",
      subCategoryFilter: "GM",
    });

    for (const offering of offerings) {
      await db.podOffering.upsert({
        where: {
          providerId_externalId: {
            providerId: providerConfig.id,
            externalId: offering.id.toString(),
          },
        },
        create: {
          providerId: providerConfig.id,
          externalId: offering.id.toString(),
          name: offering.name,
          minPages: offering.minNumberOfPages,
          maxPages: offering.maxNumberOfPages,
          widthMm: offering.dimensionWidth,
          heightMm: offering.dimensionHeight,
          pricingMeta: offering.pricingDto as object | undefined,
          isActive: true,
          syncedAt: new Date(),
        },
        update: {
          name: offering.name,
          minPages: offering.minNumberOfPages,
          maxPages: offering.maxNumberOfPages,
          widthMm: offering.dimensionWidth,
          heightMm: offering.dimensionHeight,
          pricingMeta: offering.pricingDto as object | undefined,
          syncedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      syncedCount: offerings.length,
    };
  } catch (error) {
    logger.error("Failed to sync Peecho offerings", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
