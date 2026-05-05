import { db } from "@/lib/db";

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const baseUrl =
    environment === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.status}`);
  }

  const data = (await response.json()) as PayPalTokenResponse;
  return data.access_token;
}

interface ReconciliationResult {
  checked: number;
  updated: number;
  errors: string[];
}

// PayPal payout item statuses that indicate failure
const FAILED_STATUSES = ["DENIED", "FAILED", "CANCELED"];
const _SUCCESS_STATUSES = ["SUCCESS", "UNCLAIMED"]; // UNCLAIMED = sent but not yet claimed by recipient

export async function reconcilePayPalPayoutsForCycle(
  cycleId: string,
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { checked: 0, updated: 0, errors: [] };

  const sentPayouts = await db.creatorPayout.findMany({
    where: {
      cycleId,
      status: "SENT",
      paypalBatchId: { not: null },
    },
  });

  if (sentPayouts.length === 0) {
    return result;
  }

  // Group by batch ID to minimize API calls
  const batchGroups = new Map<string, typeof sentPayouts>();
  for (const payout of sentPayouts) {
    const batchId = payout.paypalBatchId!;
    if (!batchGroups.has(batchId)) {
      batchGroups.set(batchId, []);
    }
    batchGroups.get(batchId)?.push(payout);
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const environment = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";
    const baseUrl =
      environment === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    for (const [batchId, payouts] of batchGroups) {
      try {
        // Fetch batch details from PayPal
        const response = await fetch(
          `${baseUrl}/v1/payments/payouts/${batchId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          result.errors.push(
            `Failed to fetch batch ${batchId}: ${response.status}`,
          );
          continue;
        }

        const batchData = (await response.json()) as {
          batch_header: {
            payout_batch_id: string;
            batch_status: string;
          };
          items: Array<{
            payout_item_id: string;
            sender_item_id: string;
            transaction_status: string;
            errors?: { message: string };
          }>;
        };

        // Build lookup map by payout_item_id
        const itemMap = new Map(
          batchData.items.map((item) => [item.payout_item_id, item]),
        );

        for (const payout of payouts) {
          result.checked += 1;

          // Find the PayPal item - either by paypalPayoutId or sender_item_id lookup
          const item = payout.paypalPayoutId
            ? itemMap.get(payout.paypalPayoutId)
            : batchData.items.find((i) => i.sender_item_id === payout.id);

          if (!item) {
            result.errors.push(
              `Payout ${payout.id}: not found in batch ${batchId}`,
            );
            continue;
          }

          const status = item.transaction_status;

          // Update if failed
          if (FAILED_STATUSES.includes(status)) {
            await db.creatorPayout.update({
              where: { id: payout.id },
              data: {
                status: "FAILED",
                errorMessage:
                  item.errors?.message || `PayPal status: ${status}`,
              },
            });
            result.updated += 1;
          }

          // Store paypalPayoutId if not already saved
          if (!payout.paypalPayoutId && item.payout_item_id) {
            await db.creatorPayout.update({
              where: { id: payout.id },
              data: { paypalPayoutId: item.payout_item_id },
            });
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Batch ${batchId}: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Reconciliation failed: ${message}`);
  }

  return result;
}
