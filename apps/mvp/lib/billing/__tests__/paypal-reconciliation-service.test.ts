import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    creatorPayout: { findMany: vi.fn(), update: vi.fn() },
  },
}));

describe("reconcilePayPalPayoutsForCycle", () => {
  let reconcile: typeof import("../paypal-reconciliation-service").reconcilePayPalPayoutsForCycle;
  let db: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PAYPAL_CLIENT_ID = "test-client-id";
    process.env.PAYPAL_CLIENT_SECRET = "test-secret";
    process.env.PAYPAL_ENVIRONMENT = "sandbox";
    reconcile = (await import("../paypal-reconciliation-service"))
      .reconcilePayPalPayoutsForCycle;
    db = (await import("@/lib/db")).db;
  });

  it("returns early when no SENT payouts to reconcile", async () => {
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([]);
    const r = await reconcile("cycle-1");
    expect(r.checked).toBe(0);
    expect(r.updated).toBe(0);
  });

  it("checks batch status and updates FAILED payouts", async () => {
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([
      {
        id: "p1",
        paypalBatchId: "batch-1",
        paypalPayoutId: "pp-1",
        status: "SENT",
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
                transaction_status: "FAILED",
                errors: { message: "Receiver account invalid" },
              },
            ],
          }),
      });

    const r = await reconcile("cycle-1");
    expect(r.checked).toBe(1);
    expect(r.updated).toBe(1);
    expect(db.creatorPayout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Receiver account invalid",
        }),
      }),
    );
  });

  it("does not update SUCCESS status payouts", async () => {
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([
      {
        id: "p1",
        paypalBatchId: "batch-1",
        paypalPayoutId: "pp-1",
        status: "SENT",
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

    const r = await reconcile("cycle-1");
    expect(r.checked).toBe(1);
    expect(r.updated).toBe(0);
    expect(db.creatorPayout.update).not.toHaveBeenCalled();
  });

  it("handles DENIED status as failure", async () => {
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([
      {
        id: "p1",
        paypalBatchId: "batch-1",
        paypalPayoutId: "pp-1",
        status: "SENT",
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
              batch_status: "DENIED",
            },
            items: [
              {
                payout_item_id: "pp-1",
                sender_item_id: "p1",
                transaction_status: "DENIED",
              },
            ],
          }),
      });

    const r = await reconcile("cycle-1");
    expect(r.updated).toBe(1);
    expect(db.creatorPayout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("looks up by sender_item_id when paypalPayoutId is missing", async () => {
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([
      {
        id: "p1",
        paypalBatchId: "batch-1",
        paypalPayoutId: null, // Not stored yet
        status: "SENT",
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

    const r = await reconcile("cycle-1");
    expect(r.checked).toBe(1);
    // Should store the paypalPayoutId we found
    expect(db.creatorPayout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paypalPayoutId: "pp-1" }),
      }),
    );
  });

  it("handles API errors gracefully", async () => {
    vi.mocked(db.creatorPayout.findMany).mockResolvedValue([
      {
        id: "p1",
        paypalBatchId: "batch-1",
        paypalPayoutId: "pp-1",
        status: "SENT",
      },
    ] as any);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "tok" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    const r = await reconcile("cycle-1");
    expect(r.checked).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
