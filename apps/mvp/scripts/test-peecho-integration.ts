/**
 * Real Peecho Integration Test Script
 *
 * This script tests the actual Peecho sandbox API end-to-end.
 * It requires real credentials in .env.test:
 *   PEECHO_API_KEY=<your sandbox key>
 *   PEECHO_API_URL=https://test.www.peecho.com/rest/v2
 *
 * Usage:
 *   pnpm test:peecho
 *   # or with dotenv:
 *   dotenv -e .env.test -- tsx scripts/test-peecho-integration.ts
 */

import { PeechoClient } from "@/lib/peecho/client";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function pass(msg: string) {
  console.log(`${GREEN}  ✓ ${msg}${RESET}`);
}

function fail(msg: string, error?: unknown) {
  console.error(`${RED}  ✗ ${msg}${RESET}`);
  if (error)
    console.error(
      `    ${RED}Error: ${error instanceof Error ? error.message : error}${RESET}`,
    );
}

function section(msg: string) {
  console.log(`\n${CYAN}${msg}${RESET}`);
}

function info(msg: string) {
  console.log(`${YELLOW}  → ${msg}${RESET}`);
}

type TestResult = { passed: number; failed: number };

async function runTests(): Promise<TestResult> {
  const result: TestResult = { passed: 0, failed: 0 };
  const client = new PeechoClient();

  console.log(`\n${CYAN}═══════════════════════════════════════${RESET}`);
  console.log(`${CYAN}  Peecho Sandbox Integration Tests${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════${RESET}`);

  const apiUrl =
    process.env.PEECHO_API_URL || "https://test.www.peecho.com/rest/v3";
  const hasMerchantKey = !!process.env.PEECHO_MERCHANT_API_KEY;
  info(`API URL: ${apiUrl}`);
  info(
    `Merchant API Key: ${hasMerchantKey ? "set" : "NOT SET - tests will fail"}`,
  );

  // ── Section 1: Get Offerings ─────────────────────────────────
  section("1. Fetch Offerings");

  let offerings: Awaited<ReturnType<typeof client.getOfferings>> = [];
  try {
    offerings = await client.getOfferings();

    if (offerings.length > 0) {
      pass(`Received ${offerings.length} offering(s) from Peecho`);
      result.passed++;
    } else {
      fail("No offerings returned from Peecho");
      result.failed++;
    }
  } catch (err) {
    fail("Failed to fetch offerings", err);
    result.failed++;
  }

  if (offerings.length > 0) {
    section("2. Validate Offering Structure");

    const offering = offerings[0];
    info(`First offering: "${offering.name}" (id: ${offering.id})`);

    const requiredFields: (keyof typeof offering)[] = [
      "id",
      "name",
      "minNumberOfPages",
      "maxNumberOfPages",
    ];
    for (const field of requiredFields) {
      if (offering[field] !== undefined && offering[field] !== null) {
        pass(`Offering has required field: ${field}`);
        result.passed++;
      } else {
        fail(`Offering missing required field: ${field}`);
        result.failed++;
      }
    }

    // ── Section 3: Get Quote ───────────────────────────────────
    section("3. Fetch Pricing Quote");

    const testOfferingId = offering.id?.toString();
    const testPageCount = 30;
    const testCountry = "US";

    info(
      `Requesting quote: offering=${testOfferingId}, pages=${testPageCount}, country=${testCountry}`,
    );

    try {
      const quote = await client.getQuote({
        offering_id: testOfferingId,
        page_count: testPageCount,
        country: testCountry,
      });

      pass(`Quote received successfully`);
      result.passed++;

      const currency = quote.quoteDetails.currency;
      const item = quote.quotedItems[0];

      if (item) {
        pass(`Quote has quotedItems[0]`);
        result.passed++;
      } else {
        fail(`Quote missing quotedItems`);
        result.failed++;
      }

      if (item) {
        // Validate amounts are positive numbers
        if (item.productPrice > 0) {
          pass(`Product amount is positive: ${item.productPrice} ${currency}`);
          result.passed++;
        } else {
          fail(`Product amount is not a positive number: ${item.productPrice}`);
          result.failed++;
        }

        if (item.totalItemPrice >= item.productPrice) {
          pass(
            `Total amount >= product amount: ${item.totalItemPrice} ${currency}`,
          );
          result.passed++;
        } else {
          fail(
            `Total (${item.totalItemPrice}) is less than product (${item.productPrice})`,
          );
          result.failed++;
        }

        // ── Section 4: Quote Calculation Sanity ───────────────
        section("4. Quote Calculation Sanity Check");

        const calculated =
          item.productPrice +
          item.shippingWholesale +
          item.vat -
          item.totalQuantityDiscount;
        const diff = Math.abs(calculated - item.totalItemPrice);
        const tolerance = 0.02;

        if (diff <= tolerance) {
          pass(
            `Total matches: product + shipping + vat - discount ≈ total (diff: ${diff.toFixed(4)})`,
          );
          result.passed++;
        } else {
          fail(
            `Total mismatch: ${item.productPrice} + ${item.shippingWholesale} + ${item.vat} - ${item.totalQuantityDiscount} = ${calculated.toFixed(2)} ≠ ${item.totalItemPrice}`,
          );
          result.failed++;
        }
      }
    } catch (err) {
      fail("Failed to fetch quote", err);
      result.failed++;
    }

    // ── Section 5: Quote for different countries ───────────────
    section("5. Quote for Multiple Countries");

    const countries = ["US", "DE", "GB"];
    for (const country of countries) {
      try {
        const quote = await client.getQuote({
          offering_id: testOfferingId,
          page_count: testPageCount,
          country,
        });
        const item0 = quote.quotedItems[0];
        pass(
          `Quote for ${country}: ${item0?.totalItemPrice} ${quote.quoteDetails.currency}`,
        );
        result.passed++;
      } catch (err) {
        // Some offerings may not support all countries
        info(
          `Quote for ${country} not available: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    // ── Section 6: Error handling ──────────────────────────────
    section("6. Error Handling");

    try {
      await client.getQuote({
        offering_id: "9999999",
        page_count: 30,
        country: "US",
      });
      fail("Expected error for invalid offering ID, but got success");
      result.failed++;
    } catch (_err) {
      pass("Correctly throws error for invalid offering ID");
      result.passed++;
    }
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log(`\n${CYAN}═══════════════════════════════════════${RESET}`);
  console.log(`${CYAN}  Results${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════${RESET}`);
  console.log(`${GREEN}  Passed: ${result.passed}${RESET}`);
  if (result.failed > 0) {
    console.log(`${RED}  Failed: ${result.failed}${RESET}`);
  }
  console.log(`${CYAN}═══════════════════════════════════════${RESET}\n`);

  return result;
}

runTests()
  .then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(`\n${RED}Unexpected error: ${err}${RESET}\n`);
    process.exit(1);
  });
