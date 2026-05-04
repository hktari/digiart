import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../peecho/route";

let mockHeadersMap = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: vi.fn().mockImplementation(() => ({
    get: (key: string) => mockHeadersMap.get(key),
  })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    fulfillmentOrder: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Peecho webhook POST", () => {
  let db: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockHeadersMap = new Map();
    db = (await import("@/lib/db")).db;
  });

  function makeRequest(body: object) {
    return new Request("http://localhost/api/webhooks/peecho", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  it("returns 400 when signature is missing", async () => {
    const res = await POST(makeRequest({ orderId: "1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing signature");
  });

  it("returns 400 when body is invalid JSON", async () => {
    mockHeadersMap.set("x-peecho-signature", "sig");
    const req = new Request("http://localhost/api/webhooks/peecho", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 404 when order not found", async () => {
    mockHeadersMap.set("x-peecho-signature", "sig");
    vi.mocked(db.fulfillmentOrder.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest({ orderId: "99" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Order not found");
  });

  it("updates order status for each Peecho status mapping", async () => {
    const statuses: [string, string][] = [
      ["processing", "PROCESSING"],
      ["shipped", "SHIPPED"],
      ["delivered", "DELIVERED"],
      ["failed", "FAILED"],
    ];

    for (const [incoming, expected] of statuses) {
      vi.clearAllMocks();
      mockHeadersMap.set("x-peecho-signature", "sig");
      vi.mocked(db.fulfillmentOrder.findFirst).mockResolvedValue({
        id: "fo1",
      } as any);
      vi.mocked(db.fulfillmentOrder.update).mockResolvedValue({} as any);

      const res = await POST(
        makeRequest({
          orderId: "123",
          status: incoming,
          trackingNumber: "TN001",
          trackingUrl: "https://track",
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
});
