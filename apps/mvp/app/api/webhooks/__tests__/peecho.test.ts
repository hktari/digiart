import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../peecho/route";

vi.mock("@/lib/db", () => ({
  db: {
    fulfillmentOrder: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const TEST_SECRET_KEY = "test-secret-key";

function generateSignature(orderId: string, secretKey: string): string {
  return createHash("sha256").update(`${secretKey}${orderId}`).digest("hex");
}

describe("Peecho webhook POST", () => {
  let db: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    db = (await import("@/lib/db")).db;
    process.env.PEECHO_SECRET_KEY = TEST_SECRET_KEY;
  });

  function makeRequest(body: object) {
    return new Request("http://localhost/api/webhooks/peecho", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 500 when PEECHO_SECRET_KEY is not configured", async () => {
    delete process.env.PEECHO_SECRET_KEY;
    const res = await POST(makeRequest({ order_id: "1", signature: "sig" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Webhook not configured");
  });

  it("returns 400 when signature is missing", async () => {
    const res = await POST(makeRequest({ order_id: "1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required fields");
  });

  it("returns 400 when order_id is missing", async () => {
    const res = await POST(makeRequest({ signature: "sig" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required fields");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/webhooks/peecho", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 401 when signature is invalid", async () => {
    const res = await POST(
      makeRequest({
        order_id: "123",
        signature: "invalid-signature",
        new_status: "SHIPPED",
      }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Invalid signature");
  });

  it("returns 404 when order not found", async () => {
    const orderId = "99";
    const signature = generateSignature(orderId, TEST_SECRET_KEY);
    vi.mocked(db.fulfillmentOrder.findFirst).mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        order_id: orderId,
        signature,
        new_status: "SHIPPED",
      }),
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Order not found");
  });

  it("updates order status for each Peecho status mapping", async () => {
    const statuses: [string, string][] = [
      ["in_production", "PROCESSING"],
      ["shipped", "SHIPPED"],
      ["delivered", "DELIVERED"],
      ["failed", "FAILED"],
    ];

    for (const [incoming, expected] of statuses) {
      vi.clearAllMocks();
      const orderId = "123";
      const signature = generateSignature(orderId, TEST_SECRET_KEY);
      vi.mocked(db.fulfillmentOrder.findFirst).mockResolvedValue({
        id: "fo1",
      } as any);
      vi.mocked(db.fulfillmentOrder.update).mockResolvedValue({} as any);

      const res = await POST(
        makeRequest({
          order_id: orderId,
          order_reference: "LL1123",
          old_status: "PENDING",
          new_status: incoming,
          signature,
          tracking_code: "TN001",
          tracking_url: "https://track",
        }),
      );

      expect(res.status).toBe(200);
      expect(db.fulfillmentOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: expected }),
        }),
      );
    }
  });

  it("updates tracking info when provided", async () => {
    const orderId = "123";
    const signature = generateSignature(orderId, TEST_SECRET_KEY);
    vi.mocked(db.fulfillmentOrder.findFirst).mockResolvedValue({
      id: "fo1",
    } as any);
    vi.mocked(db.fulfillmentOrder.update).mockResolvedValue({} as any);

    const res = await POST(
      makeRequest({
        order_id: orderId,
        order_reference: "LL1123",
        old_status: "IN_PRODUCTION",
        new_status: "SHIPPED",
        signature,
        tracking_code: "XXXXXXX1234",
        tracking_url:
          "https://nolp.dhl.de/nextt-online-public/en/search?piececode=XXXXXXX1234",
      }),
    );

    expect(res.status).toBe(200);
    expect(db.fulfillmentOrder.update).toHaveBeenCalledWith({
      where: { id: "fo1" },
      data: {
        status: "SHIPPED",
        trackingNumber: "XXXXXXX1234",
        trackingUrl:
          "https://nolp.dhl.de/nextt-online-public/en/search?piececode=XXXXXXX1234",
      },
    });
  });
});
