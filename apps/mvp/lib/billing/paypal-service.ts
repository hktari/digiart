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

interface SendPayoutsResult {
  sent: number;
  failed: number;
  errors: string[];
  batchId?: string;
}

export async function sendCreatorPayoutsForCycle(
  cycleId: string,
): Promise<SendPayoutsResult> {
  const result: SendPayoutsResult = { sent: 0, failed: 0, errors: [] };

  const pendingPayouts = await db.creatorPayout.findMany({
    where: {
      cycleId,
      status: "PENDING",
    },
    include: {
      creatorProfile: {
        include: {
          payoutProfile: { select: { paypalEmail: true, isReady: true } },
        },
      },
    },
  });

  if (pendingPayouts.length === 0) {
    return result;
  }

  const validPayouts = pendingPayouts.filter(
    (p) =>
      p.creatorProfile.payoutProfile?.isReady &&
      p.creatorProfile.payoutProfile?.paypalEmail,
  );

  if (validPayouts.length === 0) {
    result.errors.push("No creators with valid PayPal payout profiles");
    return result;
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const environment = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";
    const baseUrl =
      environment === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    const senderBatchId = `mvp-cycle-${cycleId}-${Date.now()}`;

    const items = validPayouts.map((payout) => ({
      recipient_type: "EMAIL",
      amount: {
        value: Number(payout.amount).toFixed(2),
        currency: payout.currency,
      },
      receiver: payout.creatorProfile.payoutProfile?.paypalEmail!,
      note: `DigiArt creator payout — ${payout.cycleId}`,
      sender_item_id: payout.id,
    }));

    const response = await fetch(`${baseUrl}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: "Your DigiArt creator payout",
        },
        items,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal payout failed: ${response.status} ${errorText}`);
    }

    const payoutResponse = (await response.json()) as {
      batch_header: { payout_batch_id: string; batch_status: string };
    };

    const batchId = payoutResponse.batch_header.payout_batch_id;

    for (const payout of validPayouts) {
      await db.creatorPayout.update({
        where: { id: payout.id },
        data: {
          status: "SENT",
          paypalBatchId: batchId,
          sentAt: new Date(),
        },
      });
    }

    result.sent = validPayouts.length;
    result.batchId = batchId;

    const skipped = pendingPayouts.filter((p) => !validPayouts.includes(p));

    for (const payout of skipped) {
      await db.creatorPayout.update({
        where: { id: payout.id },
        data: {
          status: "FAILED",
          errorMessage:
            "Creator payout profile not ready or missing PayPal email",
        },
      });
      result.failed += 1;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PayPal error";
    result.errors.push(message);

    for (const payout of validPayouts) {
      await db.creatorPayout.update({
        where: { id: payout.id },
        data: {
          status: "FAILED",
          errorMessage: message,
        },
      });
    }
    result.failed += validPayouts.length;
  }

  return result;
}
