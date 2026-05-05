import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    creatorPayout: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  },
}));

describe("sendCreatorPayoutsForCycle", () => {
  let send: typeof import("../paypal-service").sendCreatorPayoutsForCycle;
  let db: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PAYPAL_CLIENT_ID = "test-client-id";
    process.env.PAYPAL_CLIENT_SECRET = "test-secret";
    process.env.PAYPAL_ENVIRONMENT = "sandbox";
    send = (await import("../paypal-service")).sendCreatorPayoutsForCycle;
    db = (await import("@/lib/db")).db;
  });

  it("returns error when payouts already sent for cycle", async () => {
    vi.mocked(db.creatorPayout.findFirst).mockResolvedValue({
      id: "p1",
      paypalBatchId: "batch-abc",
    } as any);
    const r = await send("cycle-1");
    expect(r.errors[0]).toContain("already sent");
    expect(r.errors[0]).toContain("batch-abc");
  });

  it("returns early when no pending payouts", async () => {
    vi.mocked(db.creatorPayout.findFirst).mockResolvedValue(null);
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([]);
    const r = await send("cycle-1");
    expect(r.sent).toBe(0);
    expect(r.failed).toBe(0);
  });

  it("errors when no creators have valid payout profiles", async () => {
    vi.mocked(db.creatorPayout.findFirst).mockResolvedValue(null);
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([
      {
        id: "p1",
        cycleId: "cycle-1",
        amount: 5,
        currency: "EUR",
        status: "PENDING",
        creatorProfile: {
          payoutProfile: { paypalEmail: null, isReady: false },
        },
      },
    ] as any);
    const r = await send("cycle-1");
    expect(r.errors).toContain("No creators with valid PayPal payout profiles");
  });

  it("sends payouts and marks as SENT on success", async () => {
    vi.mocked(db.creatorPayout.findFirst).mockResolvedValue(null);
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([
      {
        id: "p1",
        cycleId: "cycle-1",
        amount: 5,
        currency: "EUR",
        status: "PENDING",
        creatorProfile: {
          payoutProfile: { paypalEmail: "creator@test.com", isReady: true },
        },
      },
    ] as any);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "tok" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            batch_header: {
              payout_batch_id: "batch-1",
              batch_status: "SUCCESS",
            },
            items: [
              {
                payout_item_id: "pp-1",
                sender_item_id: "p1",
                transaction_status: "SUCCESS",
              },
            ],
          }),
      });

    const r = await send("cycle-1");
    expect(r.sent).toBe(1);
    expect(r.batchId).toBe("batch-1");
    expect(db.creatorPayout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SENT" }),
      }),
    );
  });
});
