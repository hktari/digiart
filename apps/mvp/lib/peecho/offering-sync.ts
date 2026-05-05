import type { FulfillmentRegion } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { peechoClient } from "./client";

const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

function getFulfillmentRegion(code: string): FulfillmentRegion | null {
  const normalizedCode = code.toUpperCase();
  if (normalizedCode === "US") return "US";
  if (EU_COUNTRY_CODES.has(normalizedCode)) return "EU";
  return null;
}

export async function syncPeechoOfferings(): Promise<{
  success: boolean;
  syncedCount?: number;
  countryCount?: number;
  stateCount?: number;
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

    // Sync offerings
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

    // Sync countries and states
    const syncedAt = new Date();
    const peechoCountries = await peechoClient.getCountries();
    const usStateCodes = await peechoClient.getUSStateCodes();

    const eligibleCountries = peechoCountries
      .map((country) => ({
        code: country.code.toUpperCase(),
        name: country.name,
        region: getFulfillmentRegion(country.code),
      }))
      .filter(
        (
          country,
        ): country is {
          code: string;
          name: string;
          region: FulfillmentRegion;
        } => country.region !== null,
      )
      .sort((a, b) => a.code.localeCompare(b.code));

    const eligibleCodes = eligibleCountries.map((country) => country.code);

    for (const country of eligibleCountries) {
      await db.fulfillmentCountry.upsert({
        where: { code: country.code },
        create: {
          code: country.code,
          name: country.name,
          region: country.region,
          isActive: true,
          source: "peecho",
          syncedAt,
        },
        update: {
          name: country.name,
          region: country.region,
          isActive: true,
          source: "peecho",
          syncedAt,
        },
      });
    }

    await db.fulfillmentCountry.updateMany({
      where: {
        source: "peecho",
        code: { notIn: eligibleCodes },
        isActive: true,
      },
      data: { isActive: false, syncedAt },
    });

    for (const stateCode of usStateCodes) {
      await db.fulfillmentState.upsert({
        where: {
          countryCode_stateCode: { countryCode: "US", stateCode },
        },
        create: {
          countryCode: "US",
          stateCode,
          name: stateCode,
          isActive: true,
          source: "peecho",
          syncedAt,
        },
        update: {
          name: stateCode,
          isActive: true,
          source: "peecho",
          syncedAt,
        },
      });
    }

    await db.fulfillmentState.updateMany({
      where: {
        source: "peecho",
        countryCode: "US",
        stateCode: { notIn: usStateCodes },
        isActive: true,
      },
      data: { isActive: false, syncedAt },
    });

    return {
      success: true,
      syncedCount: offerings.length,
      countryCount: eligibleCountries.length,
      stateCount: usStateCodes.length,
    };
  } catch (error) {
    logger.error("Failed to sync Peecho offerings", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
