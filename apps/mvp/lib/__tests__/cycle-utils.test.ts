import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canEditRelease,
  canEditSelections,
  getCurrentCycle,
  getCycleStatusBadge,
  getTimeUntilLock,
} from "../cycle-utils";
import { createCycleWithStatus, createTestCycle } from "../test-utils";

// Mock db at top level
vi.mock("@/lib/db", () => ({
  db: {
    subscriptionCycle: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("getCurrentCycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current cycle when status matches", async () => {
    const { db } = await import("@/lib/db");
    const mockCycle = createTestCycle({
      status: "OPEN",
      selectionOpenDate: new Date("2025-01-01"),
      lockDate: new Date("2025-01-25"), // Future - should be OPEN
      fulfillmentDate: new Date("2025-02-01"),
    });

    vi.mocked(db.subscriptionCycle.findFirst).mockResolvedValue(mockCycle);

    const result = await getCurrentCycle();

    expect(result).toEqual(mockCycle);
  });

  it("updates and returns cycle when status differs", async () => {
    const { db } = await import("@/lib/db");
    const mockCycle = createTestCycle({
      status: "OPEN",
      selectionOpenDate: new Date("2025-01-01"),
      lockDate: new Date("2025-01-10"), // Past - should be LOCKED
      fulfillmentDate: new Date("2025-02-01"),
    });

    const updatedCycle = { ...mockCycle, status: "LOCKED" as const };

    vi.mocked(db.subscriptionCycle.findFirst).mockResolvedValue(mockCycle);
    vi.mocked(db.subscriptionCycle.update).mockResolvedValue(updatedCycle);

    const result = await getCurrentCycle();

    expect(result).toEqual(updatedCycle);
    expect(db.subscriptionCycle.update).toHaveBeenCalled();
  });

  it("returns null if no cycle exists", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.subscriptionCycle.findFirst).mockResolvedValue(null);

    const result = await getCurrentCycle();

    expect(result).toBeNull();
  });
});

describe("canEditRelease", () => {
  it("returns true when cycle is OPEN", async () => {
    const { db } = await import("@/lib/db");
    const cycle = createCycleWithStatus("OPEN");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(cycle);

    const result = await canEditRelease(cycle.id);
    expect(result).toBe(true);
  });

  it("returns false when cycle is LOCKED", async () => {
    const { db } = await import("@/lib/db");
    const cycle = createCycleWithStatus("LOCKED");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(cycle);

    const result = await canEditRelease(cycle.id);
    expect(result).toBe(false);
  });

  it("returns false when cycle is PROCESSING", async () => {
    const { db } = await import("@/lib/db");
    const cycle = createCycleWithStatus("PROCESSING");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(cycle);

    const result = await canEditRelease(cycle.id);
    expect(result).toBe(false);
  });

  it("returns false when cycle is COMPLETE", async () => {
    const { db } = await import("@/lib/db");
    const cycle = createCycleWithStatus("COMPLETE");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(cycle);

    const result = await canEditRelease(cycle.id);
    expect(result).toBe(false);
  });

  it("returns true when cycleId is null", async () => {
    const result = await canEditRelease(null);
    expect(result).toBe(true);
  });

  it("returns false when cycle not found", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);

    const result = await canEditRelease("non-existent");
    expect(result).toBe(false);
  });
});

describe("canEditSelections", () => {
  it("returns true when cycle is OPEN", async () => {
    const { db } = await import("@/lib/db");
    const cycle = createCycleWithStatus("OPEN");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(cycle);

    const result = await canEditSelections(cycle.id);
    expect(result).toBe(true);
  });

  it("returns false when cycle is LOCKED", async () => {
    const { db } = await import("@/lib/db");
    const cycle = createCycleWithStatus("LOCKED");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(cycle);

    const result = await canEditSelections(cycle.id);
    expect(result).toBe(false);
  });

  it("returns false when cycle is PROCESSING", async () => {
    const { db } = await import("@/lib/db");
    const cycle = createCycleWithStatus("PROCESSING");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(cycle);

    const result = await canEditSelections(cycle.id);
    expect(result).toBe(false);
  });

  it("returns false when cycle is COMPLETE", async () => {
    const { db } = await import("@/lib/db");
    const cycle = createCycleWithStatus("COMPLETE");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(cycle);

    const result = await canEditSelections(cycle.id);
    expect(result).toBe(false);
  });

  it("returns false when cycle not found", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);

    const result = await canEditSelections("non-existent");
    expect(result).toBe(false);
  });
});

describe("getCycleStatusBadge", () => {
  it("returns correct config for OPEN status", () => {
    const config = getCycleStatusBadge("OPEN");
    expect(config).toEqual({
      label: "Open",
      color: "green",
    });
  });

  it("returns correct config for LOCKED status", () => {
    const config = getCycleStatusBadge("LOCKED");
    expect(config).toEqual({
      label: "Locked",
      color: "yellow",
    });
  });

  it("returns correct config for PROCESSING status", () => {
    const config = getCycleStatusBadge("PROCESSING");
    expect(config).toEqual({
      label: "Processing",
      color: "blue",
    });
  });

  it("returns correct config for COMPLETE status", () => {
    const config = getCycleStatusBadge("COMPLETE");
    expect(config).toEqual({
      label: "Complete",
      color: "gray",
    });
  });
});

describe("getTimeUntilLock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates time until lock correctly - days", () => {
    const now = new Date("2025-01-15T12:00:00Z");
    vi.setSystemTime(now);

    const lockDate = new Date("2025-01-20T12:00:00Z"); // 5 days away
    const result = getTimeUntilLock(lockDate);

    expect(result.isExpired).toBe(false);
    expect(result.days).toBe(5);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  it("calculates time until lock correctly - hours", () => {
    const now = new Date("2025-01-15T12:00:00Z");
    vi.setSystemTime(now);

    const lockDate = new Date("2025-01-15T18:00:00Z"); // 6 hours away
    const result = getTimeUntilLock(lockDate);

    expect(result.isExpired).toBe(false);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(6);
    expect(result.minutes).toBe(0);
  });

  it("calculates time until lock correctly - minutes", () => {
    const now = new Date("2025-01-15T12:00:00Z");
    vi.setSystemTime(now);

    const lockDate = new Date("2025-01-15T12:30:00Z"); // 30 minutes away
    const result = getTimeUntilLock(lockDate);

    expect(result.isExpired).toBe(false);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(30);
  });

  it("returns isExpired true when lock date is in the past", () => {
    const now = new Date("2025-01-15T12:00:00Z");
    vi.setSystemTime(now);

    const lockDate = new Date("2025-01-10T12:00:00Z"); // 5 days ago
    const result = getTimeUntilLock(lockDate);

    expect(result.isExpired).toBe(true);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  it("handles exact lock date as expired", () => {
    const now = new Date("2025-01-15T12:00:00Z");
    vi.setSystemTime(now);

    const lockDate = new Date("2025-01-15T12:00:00Z"); // Exactly now
    const result = getTimeUntilLock(lockDate);

    expect(result.isExpired).toBe(true);
  });

  it("calculates complex time correctly - days, hours, minutes", () => {
    const now = new Date("2025-01-15T12:00:00Z");
    vi.setSystemTime(now);

    const lockDate = new Date("2025-01-18T14:30:00Z"); // 3 days, 2 hours, 30 minutes
    const result = getTimeUntilLock(lockDate);

    expect(result.isExpired).toBe(false);
    expect(result.days).toBe(3);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(30);
  });
});
