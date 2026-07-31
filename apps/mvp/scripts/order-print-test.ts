#!/usr/bin/env tsx
/**
 * Place the physical print-test order with Peecho.
 *
 * Creates the order UNPAID and stops. Paying is a separate Peecho call
 * (`/order/payment/`) and a separate human decision — this script will never
 * make it. See docs/print-test-order.md for what the books are for.
 *
 * Requires:
 *   --env <path>       file containing PEECHO_MERCHANT_API_KEY
 *   --address <path>   JSON shipping address (see SHAPE below)
 *   --files <path>     JSON mapping each book to a publicly fetchable PDF URL
 *
 * Peecho fetches the PDF itself, so a local path is not enough — every book
 * needs a URL their servers can GET.
 *
 *   --live             hit www.peecho.com instead of test.www.peecho.com
 *   --dry-run          print the payload and exit without calling Peecho
 *
 * SHAPE of --address:
 *   {
 *     "email_address": "you@example.com",
 *     "first_name": "...", "last_name": "...",
 *     "address_line_1": "...", "zip_code": "...", "city": "...",
 *     "country_code": "SI"
 *   }
 *
 * SHAPE of --files:
 *   { "A": "https://…/printfeed-test-A-rgb.pdf",
 *     "B": "https://…/printfeed-test-B-cmyk.pdf",
 *     "C": "https://…/printfeed-test-C-rgb-long.pdf" }
 */
import { readFileSync } from "node:fs";

/** A5 magazine, glossy laminated cover, silk content — the only A5 offering on the account. */
const OFFERING_ID = 7011275;
const WIDTH_MM = 148;
const HEIGHT_MM = 210;

const BOOKS = [
  { key: "A", reference: "printtest-a-rgb", pages: 30 },
  { key: "B", reference: "printtest-b-cmyk", pages: 30 },
  { key: "C", reference: "printtest-c-rgb-long", pages: 60 },
] as const;

interface Address {
  email_address: string;
  first_name: string;
  last_name: string;
  address_line_1: string;
  address_line_2?: string;
  zip_code: string;
  city: string;
  state?: string | null;
  country_code: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string) => process.argv.includes(`--${name}`);

function loadEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

async function main() {
  const envPath = arg("env");
  const addressPath = arg("address");
  const filesPath = arg("files");
  const dryRun = has("dry-run");
  const base = has("live")
    ? "https://www.peecho.com/rest/v3"
    : "https://test.www.peecho.com/rest/v3";

  if (!envPath || !addressPath || !filesPath) {
    throw new Error("Need --env, --address and --files. See the header.");
  }

  const key = loadEnvFile(envPath).PEECHO_MERCHANT_API_KEY;
  if (!key) throw new Error(`No PEECHO_MERCHANT_API_KEY in ${envPath}`);

  const address = JSON.parse(readFileSync(addressPath, "utf8")) as Address;
  for (const field of [
    "email_address",
    "first_name",
    "last_name",
    "address_line_1",
    "zip_code",
    "city",
    "country_code",
  ] as const) {
    if (!address[field]) throw new Error(`Address is missing ${field}`);
  }

  const files = JSON.parse(readFileSync(filesPath, "utf8")) as Record<
    string,
    string
  >;
  for (const book of BOOKS) {
    const url = files[book.key];
    if (!url) throw new Error(`No URL for book ${book.key}`);
    if (!/^https:\/\//.test(url)) {
      throw new Error(`Book ${book.key} URL must be https — Peecho fetches it`);
    }
  }

  // One order, three items: shipping is charged once, and all three come off
  // the same press run, which is what makes the comparisons fair.
  const payload = {
    merchant_api_key: key,
    currency: "EUR",
    order_reference: `printtest-${new Date().toISOString().slice(0, 10)}`,
    item_details: BOOKS.map((book) => ({
      item_reference: book.reference,
      offering_id: OFFERING_ID,
      quantity: 1,
      file_details: {
        content_url: files[book.key],
        content_width: WIDTH_MM,
        content_height: HEIGHT_MM,
        number_of_pages: book.pages,
      },
    })),
    address_details: {
      email_address: address.email_address,
      shipping_address: {
        first_name: address.first_name,
        last_name: address.last_name,
        address_line_1: address.address_line_1,
        ...(address.address_line_2
          ? { address_line_2: address.address_line_2 }
          : {}),
        zip_code: address.zip_code,
        city: address.city,
        state: address.state ?? null,
        country_code: address.country_code,
      },
    },
  };

  const redacted = { ...payload, merchant_api_key: "***" };
  console.log(`Endpoint: ${base}`);
  console.log(JSON.stringify(redacted, null, 2));

  if (dryRun) {
    console.log("\n--dry-run: nothing sent.");
    return;
  }

  const res = await fetch(`${base}/order/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Peecho ${res.status}: ${text}`);

  console.log(`\nOrder created (UNPAID):\n${text}`);
  console.log(
    "\nNot paid. Pay from the Peecho dashboard, or via /order/payment/ — " +
      "deliberately not automated here.",
  );
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
