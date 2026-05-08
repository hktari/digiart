#!/usr/bin/env node
import { PrismaPg } from "@prisma/adapter-pg";
import { type FulfillmentRegion, PrismaClient } from "@prisma/client";
import { peechoClient } from "../lib/peecho/client";

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

function getFulfillmentRegion(code: string): FulfillmentRegion {
  const normalizedCode = code.toUpperCase();

  if (normalizedCode === "US") return "US";
  if (EU_COUNTRY_CODES.has(normalizedCode)) return "EU";

  return "OTHER";
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });

  try {
    console.log("Fetching fulfillment countries from Peecho...");

    const activeOfferings = await db.podOffering.findMany({
      where: { isActive: true },
      select: { externalId: true },
    });
    const offeringIds = activeOfferings.map((o) => o.externalId);

    if (offeringIds.length === 0) {
      console.warn(
        "No active PodOfferings found in database. Run offering sync first.",
      );
    }

    const peechoCountries = await peechoClient.getCountries(offeringIds);
    const usStateCodes = await peechoClient.getUSStateCodes(offeringIds);
    const syncedAt = new Date();
    const eligibleCountries = peechoCountries
      .map((country) => ({
        code: country.code.toUpperCase(),
        name: country.name,
        region: getFulfillmentRegion(country.code),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    if (eligibleCountries.length === 0) {
      throw new Error(
        "Peecho returned no fulfillment countries for the configured offerings",
      );
    }

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
      data: {
        isActive: false,
        syncedAt,
      },
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
      data: {
        isActive: false,
        syncedAt,
      },
    });

    const euCount = eligibleCountries.filter(
      (country) => country.region === "EU",
    ).length;
    const usCount = eligibleCountries.filter(
      (country) => country.region === "US",
    ).length;
    const otherCount = eligibleCountries.filter(
      (country) => country.region === "OTHER",
    ).length;

    console.log(
      `Synced ${eligibleCountries.length} fulfillment countries from Peecho (${euCount} EU, ${usCount} US, ${otherCount} other).`,
    );
    console.log(`Active country codes: ${eligibleCodes.join(", ")}`);
    if (usStateCodes.length > 0) {
      console.log(
        `Synced ${usStateCodes.length} US fulfillment states: ${usStateCodes.join(", ")}`,
      );
    } else {
      console.log("No US fulfillment states returned by Peecho.");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to sync Peecho fulfillment countries:", error);
  process.exit(1);
});
