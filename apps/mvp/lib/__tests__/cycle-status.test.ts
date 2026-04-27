import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeCycleStatus } from "../cycle-status";
import { createTestCycle } from "../test-utils";

// Mock db at top level
vi.mock("@/lib/db", () => ({
  db: {
    subscriptionCycle: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("computeCycleStatus", () => {
  let mockNow: Date;

  beforeEach(() => {
    // Set a fixed date for testing
    mockNow = new Date("2025-01-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns OPEN when before lock date", () => {
    const cycle = createTestCycle({
      selectionOpenDate: new Date("2025-01-01"),
      lockDate: new Date("2025-01-23"), // Future
      fulfillmentDate: new Date("2025-02-01"),
      status: "OPEN",
    });

    const status = computeCycleStatus(cycle);
    expect(status).toBe("OPEN");
  });

  it("returns LOCKED when between lock date and fulfillment date", () => {
    const cycle = createTestCycle({
      selectionOpenDate: new Date("2025-01-01"),
      lockDate: new Date("2025-01-10"), // Past
      fulfillmentDate: new Date("2025-02-01"), // Future
      status: "OPEN",
    });

    const status = computeCycleStatus(cycle);
    expect(status).toBe("LOCKED");
  });

  it("returns PROCESSING on fulfillment date", () => {
    const cycle = createTestCycle({
      selectionOpenDate: new Date("2025-01-01"),
      lockDate: new Date("2025-01-10"),
      fulfillmentDate: new Date("2025-01-15"), // Today
      status: "OPEN",
    });

    const status = computeCycleStatus(cycle);
    expect(status).toBe("PROCESSING");
  });

  it("returns PROCESSING after fulfillment date (unless already COMPLETE)", () => {
    const cycle = createTestCycle({
      selectionOpenDate: new Date("2024-12-01"),
      lockDate: new Date("2024-12-23"),
      fulfillmentDate: new Date("2025-01-01"), // Past
      status: "OPEN",
    });

    const status = computeCycleStatus(cycle);
    expect(status).toBe("PROCESSING"); // Stays PROCESSING until manually set to COMPLETE
  });

  it("respects COMPLETE status once set", () => {
    const cycle = createTestCycle({
      selectionOpenDate: new Date("2024-12-01"),
      lockDate: new Date("2024-12-23"),
      fulfillmentDate: new Date("2025-01-01"), // Past
      status: "COMPLETE", // Already complete
    });

    const status = computeCycleStatus(cycle);
    expect(status).toBe("COMPLETE"); // Should stay COMPLETE
  });

  it("handles edge case at exact lock date", () => {
    const cycle = createTestCycle({
      selectionOpenDate: new Date("2025-01-01"),
      lockDate: new Date("2025-01-15T12:00:00Z"), // Exactly now
      fulfillmentDate: new Date("2025-02-01"),
      status: "OPEN",
    });

    const status = computeCycleStatus(cycle);
    expect(status).toBe("LOCKED"); // At lock date should be locked
  });

  it("handles edge case at exact fulfillment date", () => {
    const cycle = createTestCycle({
      selectionOpenDate: new Date("2025-01-01"),
      lockDate: new Date("2025-01-10"),
      fulfillmentDate: new Date("2025-01-15T12:00:00Z"), // Exactly now
      status: "OPEN",
    });

    const status = computeCycleStatus(cycle);
    expect(status).toBe("PROCESSING"); // At fulfillment date should be processing
  });
});
