import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    generatedPrintFile: { findUnique: vi.fn() },
    pricingQuoteSnapshot: { findFirst: vi.fn() },
    checkoutIntent: { findUnique: vi.fn() },
    fulfillmentOrder: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/peecho/client", () => ({
  peechoClient: { payOrder: vi.fn() },
}));

vi.mock("@/lib/billing/checkout-service", () => ({
  attachFilesToOrder: vi.fn(),
}));

describe("submitFulfillmentOrder", () => {
  let submit: typeof import("../fulfillment-service").submitFulfillmentOrder;
  let db: any;
  let peechoClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    submit = (await import("../fulfillment-service")).submitFulfillmentOrder;
    db = (await import("@/lib/db")).db;
    peechoClient = (await import("@/lib/peecho/client")).peechoClient;
  });

  it("returns error when print file not found", async () => {
    vi.mocked(db.generatedPrintFile.findUnique).mockResolvedValue(null);
    const r = await submit("pf-1");
    expect(r.success).toBe(false);
    expect(r.error).toBe("Print file not found");
  });

  it("returns error when print file is not READY", async () => {
    vi.mocked(db.generatedPrintFile.findUnique).mockResolvedValue({
      id: "pf1",
      status: "PENDING",
      storageUrl: "https://s3/file.pdf",
      collectorProfileId: "cp1",
      cycleId: "c1",
      collectorProfile: {
        id: "cp1",
        displayName: "Test",
        shippingCountry: "US",
        shippingStateCode: "CA",
        user: { email: "t@t.com", name: "T" },
      },
    } as any);
    const r = await submit("pf-1");
    expect(r.success).toBe(false);
    expect(r.error).toBe("Print file is not ready");
  });

  it("submits order successfully and creates fulfillment order", async () => {
    vi.mocked(db.generatedPrintFile.findUnique).mockResolvedValue({
      id: "pf1",
      status: "READY",
      storageUrl: "https://s3/file.pdf",
      pageCount: 24,
      collectorProfileId: "cp1",
      cycleId: "c1",
      collectorProfile: {
        id: "cp1",
        displayName: "Test",
        shippingCountry: "US",
        shippingStateCode: "CA",
        user: { email: "t@t.com", name: "T" },
      },
    } as any);
    vi.mocked(db.checkoutIntent.findUnique).mockResolvedValue({
      id: "ci1",
      peechoOrderId: "123",
      collectorProfileId: "cp1",
      cycleId: "c1",
    } as any);
    vi.mocked(db.pricingQuoteSnapshot.findFirst).mockResolvedValue({
      id: "qs1",
      currency: "USD",
      offering: { externalId: "1" },
    } as any);
    vi.mocked(db.fulfillmentOrder.findUnique).mockResolvedValue(null);
    peechoClient.payOrder.mockResolvedValue({ status: "paid" });
    vi.mocked(db.fulfillmentOrder.create).mockResolvedValue({
      id: "fo1",
      providerOrderId: "123",
    } as any);

    const r = await submit("pf-1");
    expect(r.success).toBe(true);
    expect(r.fulfillmentOrderId).toBe("fo1");
    expect(r.providerOrderId).toBe("123");
  });

  it("returns success when order already submitted (idempotent)", async () => {
    vi.mocked(db.generatedPrintFile.findUnique).mockResolvedValue({
      id: "pf1",
      status: "READY",
      storageUrl: "https://s3/file.pdf",
      collectorProfileId: "cp1",
      cycleId: "c1",
      collectorProfile: {
        id: "cp1",
        displayName: "Test",
        shippingCountry: "US",
        shippingStateCode: "CA",
        user: { email: "t@t.com", name: "T" },
      },
    } as any);
    vi.mocked(db.checkoutIntent.findUnique).mockResolvedValue({
      id: "ci1",
      peechoOrderId: "123",
      collectorProfileId: "cp1",
      cycleId: "c1",
    } as any);
    vi.mocked(db.fulfillmentOrder.findUnique).mockResolvedValue({
      id: "fo1",
      status: "SUBMITTED",
      providerOrderId: "123",
    } as any);

    const r = await submit("pf-1");
    expect(r.success).toBe(true);
    expect(r.fulfillmentOrderId).toBe("fo1");
    expect(peechoClient.payOrder).not.toHaveBeenCalled();
  });
});
