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

function getFulfillmentRegion(code: string): FulfillmentRegion | null {
  const normalizedCode = code.toUpperCase();

  if (normalizedCode === "US") return "US";
  if (EU_COUNTRY_CODES.has(normalizedCode)) return "EU";

  return null;
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

    const peechoCountries = await peechoClient.getCountries();
    const syncedAt = new Date();
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

    if (eligibleCountries.length === 0) {
      throw new Error(
        "Peecho returned no EU or US fulfillment countries for the configured offerings",
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

    const euCount = eligibleCountries.filter(
      (country) => country.region === "EU",
    ).length;
    const usCount = eligibleCountries.filter(
      (country) => country.region === "US",
    ).length;

    console.log(
      `Synced ${eligibleCountries.length} fulfillment countries from Peecho (${euCount} EU, ${usCount} US).`,
    );
    console.log(`Active country codes: ${eligibleCodes.join(", ")}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to sync Peecho fulfillment countries:", error);
  process.exit(1);
});
