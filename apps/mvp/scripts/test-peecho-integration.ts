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
    process.env.PEECHO_API_URL || "https://test.www.peecho.com/rest/v2";
  const hasButtonKey = !!process.env.PEECHO_BUTTON_KEY;
  const hasMerchantKey = !!process.env.PEECHO_MERCHANT_API_KEY;
  info(`API URL: ${apiUrl}`);
  info(`Button Key: ${hasButtonKey ? "set" : "NOT SET - tests will fail"}`);
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

      // Validate quote fields
      const quoteFields: (keyof typeof quote)[] = [
        "product_price",
        "shipping_wholesale",
        "total_price",
        "currency",
      ];

      for (const field of quoteFields) {
        if (quote[field] !== undefined && quote[field] !== null) {
          pass(`Quote has required field: ${field} = ${quote[field]}`);
          result.passed++;
        } else {
          fail(`Quote missing required field: ${field}`);
          result.failed++;
        }
      }

      // Validate amounts are positive numbers
      const productPrice = parseFloat(quote.product_price);
      const shippingPrice = parseFloat(quote.shipping_wholesale);
      const vatAmount = parseFloat(quote.vat);
      const totalPrice = parseFloat(quote.total_price);

      if (!Number.isNaN(productPrice) && productPrice > 0) {
        pass(
          `Product amount is positive: ${quote.product_price} ${quote.currency}`,
        );
        result.passed++;
      } else {
        fail(`Product amount is not a positive number: ${quote.product_price}`);
        result.failed++;
      }

      if (!Number.isNaN(totalPrice) && totalPrice >= productPrice) {
        pass(
          `Total amount >= product amount: ${quote.total_price} ${quote.currency}`,
        );
        result.passed++;
      } else {
        fail(
          `Total amount (${quote.total_price}) is less than product amount (${quote.product_price})`,
        );
        result.failed++;
      }

      // ── Section 4: Quote Calculation Sanity ───────────────
      section("4. Quote Calculation Sanity Check");

      const calculated = productPrice + shippingPrice + vatAmount;
      const diff = Math.abs(calculated - totalPrice);
      const tolerance = 0.02; // Allow 2 cents rounding tolerance

      if (diff <= tolerance) {
        pass(
          `Total amount matches: product + shipping + vat ≈ total (diff: ${diff.toFixed(4)})`,
        );
        result.passed++;
      } else {
        fail(
          `Total mismatch: ${quote.product_price} + ${quote.shipping_wholesale} + ${quote.vat} = ${calculated.toFixed(2)} ≠ ${quote.total_price}`,
        );
        result.failed++;
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
        pass(`Quote for ${country}: ${quote.total_price} ${quote.currency}`);
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
        offering_id: "nonexistent-offering-id",
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
