import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    collectorProfile: { findUnique: vi.fn() },
    subscriptionCycle: { findUnique: vi.fn() },
    collectorReleaseSelection: { findMany: vi.fn() },
    bookletConstraint: { findFirst: vi.fn() },
    checkoutIntent: { upsert: vi.fn() },
  },
}));
vi.mock("@/lib/actions/cycles", () => ({ getCurrentCycle: vi.fn() }));
vi.mock("@/lib/cycle-status", () => ({ computeCycleStatus: vi.fn() }));
vi.mock("@/lib/booklet/page-count", () => ({
  computeBookletPageCount: vi.fn(),
}));
vi.mock("@/lib/peecho/quote-service", () => ({ getQuote: vi.fn() }));
vi.mock("@/lib/pricing/quote-snapshot", () => ({
  createQuoteSnapshot: vi.fn(),
}));

describe("commitBookletForCycle", () => {
  let commit: typeof import("../collector").commitBookletForCycle;
  let auth: any;
  let db: any;
  let getCurrentCycle: any;
  let computeCycleStatus: any;
  let computeBookletPageCount: any;
  let getQuote: any;
  let createQuoteSnapshot: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    commit = (await import("../collector")).commitBookletForCycle;
    auth = (await import("@/lib/auth")).auth;
    db = (await import("@/lib/db")).db;
    getCurrentCycle = (await import("@/lib/actions/cycles")).getCurrentCycle;
    computeCycleStatus = (await import("@/lib/cycle-status"))
      .computeCycleStatus;
    computeBookletPageCount = (await import("@/lib/booklet/page-count"))
      .computeBookletPageCount;
    getQuote = (await import("@/lib/peecho/quote-service")).getQuote;
    createQuoteSnapshot = (await import("@/lib/pricing/quote-snapshot"))
      .createQuoteSnapshot;
  });

  it("returns error when no active cycle", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "cp1",
      shippingCountry: "US",
    } as any);
    getCurrentCycle.mockResolvedValue(null);

    const r = await commit();
    expect(r.success).toBe(false);
    expect(r.error).toBe("No active subscription cycle.");
  });

  it("returns error when cycle is locked", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "cp1",
      shippingCountry: "US",
    } as any);
    getCurrentCycle.mockResolvedValue({ id: "c1" });
    computeCycleStatus.mockReturnValue("LOCKED");

    const r = await commit();
    expect(r.success).toBe(false);
    expect(r.error).toBe("The current cycle is no longer open for commits.");
  });

  it("returns error when no shipping country", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "cp1",
      shippingCountry: null,
    } as any);
    getCurrentCycle.mockResolvedValue({ id: "c1" });
    computeCycleStatus.mockReturnValue("OPEN");

    const r = await commit();
    expect(r.success).toBe(false);
    expect(r.error).toBe("Please set your shipping address before committing.");
  });

  it("returns error when artwork count out of range", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "cp1",
      shippingCountry: "US",
    } as any);
    getCurrentCycle.mockResolvedValue({ id: "c1" });
    computeCycleStatus.mockReturnValue("OPEN");
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      { release: { _count: { artworks: 1 } } },
    ] as any);
    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue({
      minPages: 10,
      maxPages: 50,
    } as any);

    const r = await commit();
    expect(r.success).toBe(false);
    expect(r.error).toContain("You need at least 10 artworks");
  });

  it("commits successfully with quote and creates checkout intent", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "cp1",
      shippingCountry: "US",
      shippingStateCode: "CA",
    } as any);
    getCurrentCycle.mockResolvedValue({ id: "c1" });
    computeCycleStatus.mockReturnValue("OPEN");
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      { releaseId: "r1", release: { _count: { artworks: 12 } } },
    ] as any);
    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue({
      minPages: 10,
      maxPages: 50,
    } as any);
    computeBookletPageCount.mockReturnValue({ totalPages: 24 });
    getQuote.mockResolvedValue({
      shippingAmount: 4,
      productAmount: 10,
      baseAmount: 5,
      markupAmount: 5,
      taxAmount: 1.4,
      totalEstimate: 15.4,
      currency: "EUR",
      offeringId: "ext-1",
    });
    createQuoteSnapshot.mockResolvedValue({
      id: "qs1",
      totalEstimate: 15.4,
      currency: "EUR",
    });
    vi.mocked(db.checkoutIntent.upsert).mockResolvedValue({
      id: "ci1",
      committedAt: new Date(),
    } as any);

    const r = await commit();
    expect(r.success).toBe(true);
    expect(r.checkoutIntent?.id).toBe("ci1");
    expect(r.checkoutIntent?.estimatedTotal).toBe(15.4);
  });
});
