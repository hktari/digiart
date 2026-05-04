import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("x-peecho-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let payload: {
    orderId: string;
    status: string;
    trackingNumber?: string;
    trackingUrl?: string;
    error?: string;
  };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const fulfillmentOrder = await db.fulfillmentOrder.findFirst({
      where: { providerOrderId: String(payload.orderId) },
    });

    if (!fulfillmentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const statusMap: Record<
      string,
      "PROCESSING" | "SHIPPED" | "DELIVERED" | "FAILED"
    > = {
      processing: "PROCESSING",
      shipped: "SHIPPED",
      delivered: "DELIVERED",
      failed: "FAILED",
    };

    const newStatus = statusMap[payload.status.toLowerCase()];
    if (newStatus) {
      await db.fulfillmentOrder.update({
        where: { id: fulfillmentOrder.id },
        data: {
          status: newStatus,
          trackingNumber: payload.trackingNumber ?? undefined,
          trackingUrl: payload.trackingUrl ?? undefined,
          errorMessage: payload.error ?? undefined,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Peecho webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
