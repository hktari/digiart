import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    billingRecord: { findMany: vi.fn() },
    fulfillmentOrder: { findMany: vi.fn() },
    collectorReleaseSelection: { findMany: vi.fn() },
    payoutCalculation: { findUnique: vi.fn(), create: vi.fn() },
    creatorPayout: { upsert: vi.fn() },
  },
}));

describe("calculateCreatorEarningsForCycle", () => {
  let calc: typeof import("../payout-service").calculateCreatorEarningsForCycle;
  let db: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    calc = (await import("../payout-service")).calculateCreatorEarningsForCycle;
    db = (await import("@/lib/db")).db;
  });

  it("returns empty payouts when no eligible records", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([]);
    vi.mocked(db.fulfillmentOrder.findMany).mockResolvedValue([]);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([]);
    vi.mocked(db.payoutCalculation.findUnique).mockResolvedValue(null);
    vi.mocked(db.payoutCalculation.create).mockResolvedValue({} as any);

    const r = await calc("cycle-1");
    expect(r.payouts).toEqual([]);
    expect(r.totalMarkupPool).toBe(0);
  });

  it("calculates pro-rata markup split across creators", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([
      {
        collectorProfileId: "cp1",
        quoteSnapshot: {
          id: "qs1",
          markupAmount: 5,
          currency: "EUR",
          isFrozen: true,
        },
      },
      {
        collectorProfileId: "cp2",
        quoteSnapshot: {
          id: "qs2",
          markupAmount: 5,
          currency: "EUR",
          isFrozen: true,
        },
      },
    ] as any);
    vi.mocked(db.fulfillmentOrder.findMany).mockResolvedValue([
      { collectorProfileId: "cp1" },
      { collectorProfileId: "cp2" },
    ] as any);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      { release: { creatorProfileId: "creator-1", _count: { artworks: 3 } } },
      { release: { creatorProfileId: "creator-2", _count: { artworks: 2 } } },
    ] as any);
    vi.mocked(db.payoutCalculation.findUnique).mockResolvedValue(null);
    vi.mocked(db.payoutCalculation.create).mockResolvedValue({} as any);

    const r = await calc("cycle-1");
    expect(r.totalMarkupPool).toBe(10);
    expect(r.payouts.length).toBe(2);
    const c1 = r.payouts.find((p: any) => p.creatorId === "creator-1")!;
    const c2 = r.payouts.find((p: any) => p.creatorId === "creator-2")!;
    expect(c1.amount).toBe(6); // 3/5 * 10
    expect(c2.amount).toBe(4); // 2/5 * 10
  });

  it("skips payout calculation when existing calculation found (idempotent)", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([
      {
        collectorProfileId: "cp1",
        quoteSnapshot: {
          id: "qs1",
          markupAmount: 5,
          currency: "EUR",
          isFrozen: true,
        },
      },
    ] as any);
    vi.mocked(db.fulfillmentOrder.findMany).mockResolvedValue([
      { collectorProfileId: "cp1" },
    ] as any);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      { release: { creatorProfileId: "creator-1", _count: { artworks: 1 } } },
    ] as any);
    vi.mocked(db.payoutCalculation.findUnique).mockResolvedValue({
      id: "pc1",
    } as any);

    const r = await calc("cycle-1");
    expect(db.payoutCalculation.create).not.toHaveBeenCalled();
    expect(r.payouts.length).toBe(1);
  });

  it("filters out non-fulfilled collectors from earnings", async () => {
    vi.mocked(db.billingRecord.findMany).mockResolvedValue([
      {
        collectorProfileId: "cp1",
        quoteSnapshot: {
          id: "qs1",
          markupAmount: 5,
          currency: "EUR",
          isFrozen: true,
        },
      },
      {
        collectorProfileId: "cp2",
        quoteSnapshot: {
          id: "qs2",
          markupAmount: 5,
          currency: "EUR",
          isFrozen: true,
        },
      },
    ] as any);
    vi.mocked(db.fulfillmentOrder.findMany).mockResolvedValue([
      { collectorProfileId: "cp1" },
    ] as any);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      { release: { creatorProfileId: "creator-1", _count: { artworks: 1 } } },
    ] as any);
    vi.mocked(db.payoutCalculation.findUnique).mockResolvedValue(null);
    vi.mocked(db.payoutCalculation.create).mockResolvedValue({} as any);

    const r = await calc("cycle-1");
    expect(r.totalMarkupPool).toBe(5);
    expect(r.fulfilledCollectors).toBe(1);
  });
});
