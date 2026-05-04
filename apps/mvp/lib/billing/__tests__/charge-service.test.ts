import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    collectorProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    billingRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../stripe-client", () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    paymentMethods: {
      list: vi.fn(),
    },
    paymentIntents: {
      create: vi.fn(),
    },
  },
}));

describe("chargeCollectorFromFrozenQuote", () => {
  let chargeCollectorFromFrozenQuote: typeof import("../charge-service").chargeCollectorFromFrozenQuote;
  let db: Awaited<typeof import("@/lib/db")>["db"];
  let stripe: Awaited<typeof import("../stripe-client")>["stripe"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const chargeMod = await import("../charge-service");
    chargeCollectorFromFrozenQuote = chargeMod.chargeCollectorFromFrozenQuote;
    db = (await import("@/lib/db")).db;
    stripe = (await import("../stripe-client")).stripe;
  });

  const baseParams = {
    collectorProfileId: "collector-1",
    cycleId: "cycle-1",
    quoteSnapshotId: "snapshot-1",
    amount: 29.99,
    currency: "EUR",
    idempotencyKey: "idem-1",
  };

  it("returns error when collector profile not found", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue(null);

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Collector profile not found");
  });

  it("returns success when billing record is already PAID", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_123",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue({
      id: "bill-1",
      status: "PAID",
      stripePaymentIntentId: "pi_123",
    } as any);

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(result.success).toBe(true);
    expect(result.billingRecordId).toBe("bill-1");
    expect(result.stripePaymentIntentId).toBe("pi_123");
  });

  it("creates Stripe customer when stripeCustomerId is missing", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: null,
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.customers.create).mockResolvedValue({
      id: "cus_new",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [{ id: "pm_1" }],
    } as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: "pi_1",
      status: "succeeded",
    } as any);

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@test.com",
        metadata: { collectorProfileId: "collector-1" },
      }),
    );
    expect(db.collectorProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stripeCustomerId: "cus_new" },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("reuses existing stripeCustomerId from profile", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_existing",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [{ id: "pm_1" }],
    } as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: "pi_1",
      status: "succeeded",
    } as any);

    await chargeCollectorFromFrozenQuote(baseParams);

    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
      expect.any(Object),
    );
  });

  it("returns GRACE_PERIOD when no saved payment method", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_123",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [],
    } as any);

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(result.success).toBe(false);
    expect(result.error).toContain("No saved payment method");
    expect(db.billingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "GRACE_PERIOD" }),
      }),
    );
  });

  it("handles successful payment", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_123",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [{ id: "pm_1" }],
    } as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: "pi_1",
      status: "succeeded",
    } as any);

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(result.success).toBe(true);
    expect(result.stripePaymentIntentId).toBe("pi_1");
    expect(db.billingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAID",
          stripePaymentIntentId: "pi_1",
        }),
      }),
    );
  });

  it("handles processing status as retryable", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_123",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [{ id: "pm_1" }],
    } as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: "pi_1",
      status: "processing",
    } as any);

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.error).toBe("Payment is processing");
  });

  it("handles requires_action as GRACE_PERIOD", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_123",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [{ id: "pm_1" }],
    } as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: "pi_1",
      status: "requires_action",
    } as any);

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(result.success).toBe(false);
    expect(db.billingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "GRACE_PERIOD" }),
      }),
    );
  });

  it("handles StripeCardError as GRACE_PERIOD", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_123",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [{ id: "pm_1" }],
    } as any);
    vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
      new Stripe.errors.StripeCardError({
        message: "Your card was declined",
        type: "card_error",
        decline_code: "generic_decline",
      } as any),
    );

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your card was declined");
    expect(db.billingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "GRACE_PERIOD" }),
      }),
    );
  });

  it("handles StripeConnectionError as retryable", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_123",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [{ id: "pm_1" }],
    } as any);
    vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
      new Stripe.errors.StripeConnectionError({
        message: "Network error",
        type: "api_connection_error",
      } as any),
    );

    const result = await chargeCollectorFromFrozenQuote(baseParams);

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
  });

  it("uses idempotency key on payment intent creation", async () => {
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
      stripeCustomerId: "cus_123",
      user: { email: "test@test.com", name: "Test" },
    } as any);
    vi.mocked(db.billingRecord.findUnique).mockResolvedValue(null);
    vi.mocked(db.billingRecord.create).mockResolvedValue({
      id: "bill-1",
      status: "PENDING",
    } as any);
    vi.mocked(stripe.paymentMethods.list).mockResolvedValue({
      data: [{ id: "pm_1" }],
    } as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: "pi_1",
      status: "succeeded",
    } as any);

    await chargeCollectorFromFrozenQuote(baseParams);

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ idempotencyKey: "idem-1" }),
    );
  });
});
