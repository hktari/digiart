#!/usr/bin/env node
import { type PeechoOffering, peechoClient } from "../lib/peecho/client";

function formatDimension(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value}mm`
    : "n/a";
}

function formatPrice(offering: PeechoOffering): string {
  if (!offering.pricingDto) return "n/a";

  const { currency, price, pricePerPage } = offering.pricingDto;
  return `${price} ${currency} base, ${pricePerPage} ${currency}/page`;
}

async function main() {
  const apiUrl =
    process.env.PEECHO_API_URL || "https://test.www.peecho.com/rest/v3";
  const hasMerchantKey = Boolean(process.env.PEECHO_MERCHANT_API_KEY);

  console.log("Fetching Peecho offerings...");
  console.log(`API URL: ${apiUrl}`);
  console.log(`Merchant API key: ${hasMerchantKey ? "set" : "missing"}`);
  console.log("");

  const offerings = await peechoClient.getOfferings();

  if (offerings.length === 0) {
    console.log("No offerings returned by Peecho.");
    return;
  }

  const sortedOfferings = offerings.sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  console.log(`Found ${sortedOfferings.length} offering(s):`);
  console.log("");

  for (const offering of sortedOfferings) {
    console.log(`${offering.id} - ${offering.name}`);
    console.log(`  catalogue: ${offering.catalogueItemCode || "n/a"}`);
    console.log(
      `  pages: ${offering.minNumberOfPages}-${offering.maxNumberOfPages}`,
    );
    console.log(
      `  dimensions: ${formatDimension(offering.dimensionWidth)} x ${formatDimension(offering.dimensionHeight)}`,
    );
    console.log(`  dynamic size: ${offering.dynamicSize ? "yes" : "no"}`);
    console.log(`  pricing: ${formatPrice(offering)}`);
    console.log("");
  }
}

main().catch((error) => {
  console.error("Failed to list Peecho offerings:", error);
  process.exit(1);
});
