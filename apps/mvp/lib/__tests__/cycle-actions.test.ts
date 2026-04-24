import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createCycle,
  updateCycle,
  deleteCycle,
  updateCycleStatus,
} from "../actions/cycle-actions";

vi.mock("@/lib/db", () => ({
  db: {
    subscriptionCycle: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/roles", () => ({
  requireAdmin: vi.fn().mockResolvedValue("admin-user-1"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

const validCycleFormData = {
  label: "January 2025",
  month: "1",
  year: "2025",
  selectionOpenDate: "2025-01-01",
  lockDate: "2025-01-23",
  fulfillmentDate: "2025-02-01",
};

describe("createCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates cycle with valid data", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);
    const mockCycle = {
      id: "cy1",
      label: "January 2025",
      month: 1,
      year: 2025,
    };
    vi.mocked(db.subscriptionCycle.create).mockResolvedValue(
      mockCycle as never,
    );

    const fd = makeFormData(validCycleFormData);
    const result = await createCycle(fd);

    expect(result.success).toBe(true);
    expect(result.cycle).toEqual(mockCycle);
  });

  it("returns error when cycle for same month/year already exists", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cy-existing",
      month: 1,
      year: 2025,
    } as never);

    const fd = makeFormData(validCycleFormData);
    const result = await createCycle(fd);

    expect(result.error).toBe("A cycle for this month and year already exists");
    expect(db.subscriptionCycle.create).not.toHaveBeenCalled();
  });

  it("returns error when selectionOpenDate >= lockDate", async () => {
    const fd = makeFormData({
      ...validCycleFormData,
      selectionOpenDate: "2025-01-25", // After lockDate
      lockDate: "2025-01-23",
    });

    const result = await createCycle(fd);
    expect(result.error).toBeDefined();
  });

  it("returns error when lockDate >= fulfillmentDate", async () => {
    const fd = makeFormData({
      ...validCycleFormData,
      lockDate: "2025-02-05", // After fulfillmentDate
      fulfillmentDate: "2025-02-01",
    });

    const result = await createCycle(fd);
    expect(result.error).toBeDefined();
  });

  it("returns error when label is empty", async () => {
    const fd = makeFormData({ ...validCycleFormData, label: "" });
    const result = await createCycle(fd);
    expect(result.error).toBeDefined();
  });

  it("returns error when DB create fails", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);
    vi.mocked(db.subscriptionCycle.create).mockRejectedValue(
      new Error("DB error"),
    );

    const fd = makeFormData(validCycleFormData);
    const result = await createCycle(fd);

    expect(result.error).toBe("Failed to create cycle");
  });
});

describe("updateCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates cycle with valid data", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findFirst).mockResolvedValue(null);
    const updated = { id: "cy1", label: "January 2025 Updated" };
    vi.mocked(db.subscriptionCycle.update).mockResolvedValue(updated as never);

    const fd = makeFormData({ ...validCycleFormData, status: "OPEN" });
    const result = await updateCycle("cy1", fd);

    expect(result.success).toBe(true);
    expect(result.cycle).toEqual(updated);
  });

  it("returns error when another cycle has same month/year", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findFirst).mockResolvedValue({
      id: "cy-other",
      month: 1,
      year: 2025,
    } as never);

    const fd = makeFormData({ ...validCycleFormData, status: "OPEN" });
    const result = await updateCycle("cy1", fd);

    expect(result.error).toBe("A cycle for this month and year already exists");
  });

  it("returns error on validation failure", async () => {
    const fd = makeFormData({ ...validCycleFormData, label: "" });
    const result = await updateCycle("cy1", fd);
    expect(result.error).toBeDefined();
  });
});

describe("deleteCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes cycle with no related data", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cy1",
      selections: [],
      releases: [],
    } as never);
    vi.mocked(db.subscriptionCycle.delete).mockResolvedValue({} as never);

    const result = await deleteCycle("cy1");

    expect(result.success).toBe(true);
    expect(db.subscriptionCycle.delete).toHaveBeenCalledWith({
      where: { id: "cy1" },
    });
  });

  it("returns error when cycle not found", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);

    const result = await deleteCycle("nonexistent");

    expect(result.error).toBe("Cycle not found");
    expect(db.subscriptionCycle.delete).not.toHaveBeenCalled();
  });

  it("returns error when cycle has releases", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cy1",
      selections: [],
      releases: [{ id: "r1" }],
    } as never);

    const result = await deleteCycle("cy1");

    expect(result.error).toBe(
      "Cannot delete cycle with existing selections or releases",
    );
    expect(db.subscriptionCycle.delete).not.toHaveBeenCalled();
  });

  it("returns error when cycle has selections", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cy1",
      selections: [{ id: "s1" }],
      releases: [],
    } as never);

    const result = await deleteCycle("cy1");

    expect(result.error).toBe(
      "Cannot delete cycle with existing selections or releases",
    );
  });

  it("returns error when delete fails", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cy1",
      selections: [],
      releases: [],
    } as never);
    vi.mocked(db.subscriptionCycle.delete).mockRejectedValue(
      new Error("DB error"),
    );

    const result = await deleteCycle("cy1");

    expect(result.error).toBe("Failed to delete cycle");
  });
});

describe("updateCycleStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates cycle status successfully", async () => {
    const { db } = await import("@/lib/db");

    const updated = { id: "cy1", status: "LOCKED" };
    vi.mocked(db.subscriptionCycle.update).mockResolvedValue(updated as never);

    const result = await updateCycleStatus("cy1", "LOCKED");

    expect(result.success).toBe(true);
    expect(result.cycle).toEqual(updated);
    expect(db.subscriptionCycle.update).toHaveBeenCalledWith({
      where: { id: "cy1" },
      data: { status: "LOCKED" },
    });
  });

  it("updates to each valid status", async () => {
    const { db } = await import("@/lib/db");

    for (const status of [
      "OPEN",
      "LOCKED",
      "PROCESSING",
      "COMPLETE",
    ] as const) {
      vi.mocked(db.subscriptionCycle.update).mockResolvedValue({
        id: "cy1",
        status,
      } as never);
      const result = await updateCycleStatus("cy1", status);
      expect(result.success).toBe(true);
    }
  });

  it("returns error when update fails", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.update).mockRejectedValue(
      new Error("DB error"),
    );

    const result = await updateCycleStatus("cy1", "COMPLETE");

    expect(result.error).toBe("Failed to update cycle status");
  });
});
