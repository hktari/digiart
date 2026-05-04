import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    subscriptionCycle: { findUnique: vi.fn() },
    collectorReleaseSelection: { findMany: vi.fn() },
    generatedPrintFile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/billing/reconciliation-service", () => ({
  getFulfillmentEligibleCollectors: vi.fn(),
}));

const mockAdd = vi.fn();
const mockClose = vi.fn();

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = mockAdd;
    close = mockClose;
  },
}));

describe("triggerPdfGenerationForCycle", () => {
  let trigger: typeof import("../pdf-trigger-service").triggerPdfGenerationForCycle;
  let db: any;
  let getEligible: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    trigger = (await import("../pdf-trigger-service"))
      .triggerPdfGenerationForCycle;
    db = (await import("@/lib/db")).db;
    getEligible = (await import("@/lib/billing/reconciliation-service"))
      .getFulfillmentEligibleCollectors;
  });

  it("returns error when cycle not found", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);
    const r = await trigger("cycle-1");
    expect(r.errors).toContain("Cycle cycle-1 not found");
  });

  it("enqueues new booklet generation jobs", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      label: "Jan",
      year: 2026,
    } as any);
    getEligible.mockResolvedValue([{ collectorProfile: { id: "cp1" } }]);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      { id: "s1" },
    ] as any);
    vi.mocked(db.generatedPrintFile.findUnique).mockResolvedValue(null);
    vi.mocked(db.generatedPrintFile.create).mockResolvedValue({
      id: "pf1",
    } as any);

    const r = await trigger("cycle-1");

    expect(r.enqueued).toBe(1);
    expect(mockAdd).toHaveBeenCalledWith(
      "generate",
      expect.objectContaining({ collectorProfileId: "cp1" }),
      expect.any(Object),
    );
  });

  it("skips collectors with no selections", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      label: "Jan",
      year: 2026,
    } as any);
    getEligible.mockResolvedValue([{ collectorProfile: { id: "cp1" } }]);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([]);

    const r = await trigger("cycle-1");
    expect(r.enqueued).toBe(0);
    expect(r.skipped.length).toBe(1);
    expect(r.skipped[0].reason).toBe("No selections");
  });

  it("skips collectors with already READY print file", async () => {
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      label: "Jan",
      year: 2026,
    } as any);
    getEligible.mockResolvedValue([{ collectorProfile: { id: "cp1" } }]);
    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      { id: "s1" },
    ] as any);
    vi.mocked(db.generatedPrintFile.findUnique).mockResolvedValue({
      id: "pf1",
      status: "READY",
    } as any);

    const r = await trigger("cycle-1");
    expect(r.enqueued).toBe(0);
  });
});
