import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    stripeWebhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    billingRecord: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/billing/stripe-client", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

describe("POST /api/webhooks/stripe", () => {
  let POST: (req: Request) => Promise<Response>;
  let db: Awaited<typeof import("@/lib/db")>["db"];
  let stripe: Awaited<typeof import("@/lib/billing/stripe-client")>["stripe"];
  let mockHeaders: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const mod = await import("@/app/api/webhooks/stripe/route");
    POST = mod.POST;
    db = (await import("@/lib/db")).db;
    stripe = (await import("@/lib/billing/stripe-client")).stripe;
    mockHeaders = (await import("next/headers")).headers as ReturnType<
      typeof vi.fn
    >;
  });

  function createRequest(body: string, signature: string | null): Request {
    return new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body,
      headers: signature ? { "stripe-signature": signature } : {},
    });
  }

  it("returns 400 when stripe-signature header is missing", async () => {
    mockHeaders.mockResolvedValue(new Map());
    const req = createRequest("{}", null);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing stripe-signature header");
  });

  it("returns 500 when webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    mockHeaders.mockResolvedValue(new Map([["stripe-signature", "sig_123"]]));
    const req = createRequest("{}", "sig_123");
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Webhook secret not configured");
  });

  it("returns 400 on invalid signature", async () => {
    mockHeaders.mockResolvedValue(new Map([["stripe-signature", "bad_sig"]]));
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const req = createRequest("{}", "bad_sig");
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid signature");
  });

  it("skips already-processed events", async () => {
    mockHeaders.mockResolvedValue(new Map([["stripe-signature", "sig_123"]]));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_123",
      type: "payment_intent.succeeded",
      data: { object: { metadata: {} } },
    } as any);
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValue({
      id: "evt_123",
      processedAt: new Date(),
    } as any);

    const req = createRequest("{}", "sig_123");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(db.billingRecord.update).not.toHaveBeenCalled();
  });

  it("handles payment_intent.succeeded and marks as PAID", async () => {
    mockHeaders.mockResolvedValue(new Map([["stripe-signature", "sig_123"]]));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_1",
          metadata: { billingRecordId: "bill-1" },
        },
      },
    } as any);
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);

    const req = createRequest("{}", "sig_123");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(db.billingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAID" }),
      }),
    );
    expect(db.stripeWebhookEvent.create).toHaveBeenCalledWith({
      data: { id: "evt_1" },
    });
  });

  it("does not overwrite already PAID record on succeeded event", async () => {
    mockHeaders.mockResolvedValue(new Map([["stripe-signature", "sig_123"]]));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_1",
          metadata: { billingRecordId: "bill-1" },
        },
      },
    } as any);
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue({
      id: "bill-1",
      status: "PAID",
    } as any);

    const req = createRequest("{}", "sig_123");
    await POST(req);

    expect(db.billingRecord.update).not.toHaveBeenCalled();
  });

  it("handles payment_intent.processing", async () => {
    mockHeaders.mockResolvedValue(new Map([["stripe-signature", "sig_123"]]));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_2",
      type: "payment_intent.processing",
      data: {
        object: {
          id: "pi_2",
          metadata: { billingRecordId: "bill-2" },
        },
      },
    } as any);
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue({
      id: "bill-2",
      status: "PENDING",
    } as any);

    const req = createRequest("{}", "sig_123");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(db.billingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripePaymentIntentId: "pi_2",
        }),
      }),
    );
  });

  it("does not overwrite PAID record on payment_failed event", async () => {
    mockHeaders.mockResolvedValue(new Map([["stripe-signature", "sig_123"]]));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_3",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_3",
          metadata: { billingRecordId: "bill-3" },
          last_payment_error: { message: "Card declined" },
        },
      },
    } as any);
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue({
      id: "bill-3",
      status: "PAID",
    } as any);

    const req = createRequest("{}", "sig_123");
    await POST(req);

    expect(db.billingRecord.update).not.toHaveBeenCalled();
  });

  it("does not overwrite PAID record on canceled event", async () => {
    mockHeaders.mockResolvedValue(new Map([["stripe-signature", "sig_123"]]));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_4",
      type: "payment_intent.canceled",
      data: {
        object: {
          id: "pi_4",
          metadata: { billingRecordId: "bill-4" },
        },
      },
    } as any);
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue({
      id: "bill-4",
      status: "PAID",
    } as any);

    const req = createRequest("{}", "sig_123");
    await POST(req);

    expect(db.billingRecord.update).not.toHaveBeenCalled();
  });
});
