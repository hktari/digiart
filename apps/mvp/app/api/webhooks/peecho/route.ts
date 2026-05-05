import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

interface PeechoWebhookPayload {
  signature: string;
  order_id: string;
  order_reference: string;
  old_status: string;
  new_status: string;
  tracking_code?: string;
  tracking_url?: string;
}

function verifySignature(
  payload: PeechoWebhookPayload,
  secretKey: string,
): boolean {
  const expectedSignature = createHash("sha256")
    .update(`${secretKey}${payload.order_id}`)
    .digest("hex");
  return payload.signature === expectedSignature;
}

export async function POST(request: Request) {
  const secretKey = process.env.PEECHO_SECRET_KEY;

  if (!secretKey) {
    logger.error("PEECHO_SECRET_KEY not configured - webhook unavailable");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  let payload: PeechoWebhookPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.signature || !payload.order_id) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!verifySignature(payload, secretKey)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const fulfillmentOrder = await db.fulfillmentOrder.findFirst({
      where: { providerOrderId: String(payload.order_id) },
    });

    if (!fulfillmentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const statusMap: Record<
      string,
      "PROCESSING" | "SHIPPED" | "DELIVERED" | "FAILED"
    > = {
      in_production: "PROCESSING",
      shipped: "SHIPPED",
      delivered: "DELIVERED",
      failed: "FAILED",
    };

    const newStatus = statusMap[payload.new_status.toLowerCase()];
    if (newStatus) {
      await db.fulfillmentOrder.update({
        where: { id: fulfillmentOrder.id },
        data: {
          status: newStatus,
          trackingNumber: payload.tracking_code ?? undefined,
          trackingUrl: payload.tracking_url ?? undefined,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Peecho webhook handler error", error, {
      orderId: payload?.order_id,
      newStatus: payload?.new_status,
    });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
