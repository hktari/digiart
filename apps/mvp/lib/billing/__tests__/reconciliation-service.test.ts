import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    billingRecord: { findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../stripe-client", () => ({
  stripe: { paymentIntents: { retrieve: vi.fn() } },
}));

describe("reconcileBillingForCycle", () => {
  let reconcile: typeof import("../reconciliation-service").reconcileBillingForCycle;
  let db: any;
  let stripe: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    reconcile = (await import("../reconciliation-service"))
      .reconcileBillingForCycle;
    db = (await import("@/lib/db")).db;
    stripe = (await import("../stripe-client")).stripe;
  });

  it("counts already PAID records as reconciled", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([
      { id: "b1", status: "PAID", stripePaymentIntentId: "pi_1" },
      { id: "b2", status: "PAID", stripePaymentIntentId: "pi_2" },
    ] as any);
    const r = await reconcile("cycle-1");
    expect(r.reconciled).toBe(2);
    expect(r.paid).toBe(2);
  });

  it("reconciles pending to PAID when Stripe confirms success", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([
      { id: "b1", status: "PENDING", stripePaymentIntentId: "pi_1" },
    ] as any);
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      status: "succeeded",
    } as any);
    const r = await reconcile("cycle-1");
    expect(r.paid).toBe(1);
    expect(db.billingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAID" }),
      }),
    );
  });

  it("reconciles pending to FAILED when Stripe reports failure", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([
      { id: "b1", status: "PENDING", stripePaymentIntentId: "pi_1" },
    ] as any);
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      status: "requires_payment_method",
      last_payment_error: { message: "Card declined" },
    } as any);
    const r = await reconcile("cycle-1");
    expect(r.failed).toBe(1);
    expect(db.billingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("keeps pending when no stripePaymentIntentId", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([
      { id: "b1", status: "PENDING", stripePaymentIntentId: null },
    ] as any);
    const r = await reconcile("cycle-1");
    expect(r.pending).toBe(1);
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });
});

describe("getFulfillmentEligibleCollectors", () => {
  let getEligible: typeof import("../reconciliation-service").getFulfillmentEligibleCollectors;
  let db: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    getEligible = (await import("../reconciliation-service"))
      .getFulfillmentEligibleCollectors;
    db = (await import("@/lib/db")).db;
  });

  it("returns only PAID records with frozen quote and shipping country", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([
      {
        collectorProfile: { id: "cp1", shippingCountry: "US" },
        quoteSnapshot: { id: "qs1", isFrozen: true },
      },
      {
        collectorProfile: { id: "cp2", shippingCountry: null },
        quoteSnapshot: { id: "qs2", isFrozen: true },
      },
      {
        collectorProfile: { id: "cp3", shippingCountry: "DE" },
        quoteSnapshot: { id: "qs3", isFrozen: false },
      },
    ] as any);
    const r = await getEligible("cycle-1");
    expect(r.length).toBe(1);
    expect(r[0].collectorProfile.id).toBe("cp1");
  });
});
