import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConstraint,
  deleteConstraint,
  toggleConstraintActive,
  updateConstraint,
} from "../actions/constraint-actions";

vi.mock("@/lib/db", () => ({
  db: {
    bookletConstraint: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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

describe("createConstraint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates constraint with valid data", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue(null);
    vi.mocked(db.bookletConstraint.updateMany).mockResolvedValue({ count: 0 });
    const mockConstraint = {
      id: "c1",
      minPages: 30,
      maxPages: 50,
      isActive: true,
      version: 1,
    };
    vi.mocked(db.bookletConstraint.create).mockResolvedValue(
      mockConstraint as never,
    );

    const fd = makeFormData({
      minPages: "30",
      maxPages: "50",
      isActive: "true",
    });
    const result = await createConstraint(fd);

    expect(result.success).toBe(true);
    expect(result.constraint).toEqual(mockConstraint);
  });

  it("deactivates other constraints when creating active one", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue({
      version: 2,
    } as never);
    vi.mocked(db.bookletConstraint.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(db.bookletConstraint.create).mockResolvedValue({
      id: "c2",
      version: 3,
    } as never);

    const fd = makeFormData({
      minPages: "30",
      maxPages: "50",
      isActive: "true",
    });
    await createConstraint(fd);

    expect(db.bookletConstraint.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
  });

  it("does not deactivate others when creating inactive constraint", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue(null);
    vi.mocked(db.bookletConstraint.create).mockResolvedValue({
      id: "c1",
    } as never);

    const fd = makeFormData({
      minPages: "30",
      maxPages: "50",
      isActive: "false",
    });
    await createConstraint(fd);

    expect(db.bookletConstraint.updateMany).not.toHaveBeenCalled();
  });

  it("returns error when minPages >= maxPages", async () => {
    const fd = makeFormData({
      minPages: "50",
      maxPages: "30",
      isActive: "false",
    });
    const result = await createConstraint(fd);

    expect(result.error).toBeDefined();
    expect(result.success).toBeUndefined();
  });

  it("increments version from latest", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue({
      version: 5,
    } as never);
    vi.mocked(db.bookletConstraint.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(db.bookletConstraint.create).mockResolvedValue({
      id: "c1",
      version: 6,
    } as never);

    const fd = makeFormData({
      minPages: "10",
      maxPages: "50",
      isActive: "false",
    });
    await createConstraint(fd);

    expect(db.bookletConstraint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ version: 6 }),
    });
  });

  it("returns version 1 when no existing constraints", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue(null);
    vi.mocked(db.bookletConstraint.create).mockResolvedValue({
      id: "c1",
      version: 1,
    } as never);

    const fd = makeFormData({
      minPages: "10",
      maxPages: "50",
      isActive: "false",
    });
    await createConstraint(fd);

    expect(db.bookletConstraint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ version: 1 }),
    });
  });
});

describe("updateConstraint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates constraint with valid data", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.updateMany).mockResolvedValue({ count: 0 });
    const updated = { id: "c1", minPages: 25, maxPages: 60, isActive: true };
    vi.mocked(db.bookletConstraint.update).mockResolvedValue(updated as never);

    const fd = makeFormData({
      minPages: "25",
      maxPages: "60",
      isActive: "true",
    });
    const result = await updateConstraint("c1", fd);

    expect(result.success).toBe(true);
    expect(result.constraint).toEqual(updated);
  });

  it("deactivates others except self when activating", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(db.bookletConstraint.update).mockResolvedValue({
      id: "c1",
    } as never);

    const fd = makeFormData({
      minPages: "25",
      maxPages: "60",
      isActive: "true",
    });
    await updateConstraint("c1", fd);

    expect(db.bookletConstraint.updateMany).toHaveBeenCalledWith({
      where: { isActive: true, id: { not: "c1" } },
      data: { isActive: false },
    });
  });

  it("returns error for invalid data", async () => {
    const fd = makeFormData({
      minPages: "60",
      maxPages: "20",
      isActive: "false",
    });
    const result = await updateConstraint("c1", fd);

    expect(result.error).toBeDefined();
  });
});

describe("deleteConstraint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes constraint successfully", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.delete).mockResolvedValue({} as never);

    const result = await deleteConstraint("c1");

    expect(result.success).toBe(true);
    expect(db.bookletConstraint.delete).toHaveBeenCalledWith({
      where: { id: "c1" },
    });
  });

  it("returns error when delete fails", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.delete).mockRejectedValue(
      new Error("DB error"),
    );

    const result = await deleteConstraint("c1");

    expect(result.error).toBe("Failed to delete constraint");
  });
});

describe("toggleConstraintActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates inactive constraint and deactivates others", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findUnique).mockResolvedValue({
      id: "c1",
      isActive: false,
    } as never);
    vi.mocked(db.bookletConstraint.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(db.bookletConstraint.update).mockResolvedValue({
      id: "c1",
      isActive: true,
    } as never);

    const result = await toggleConstraintActive("c1");

    expect(result.success).toBe(true);
    expect(db.bookletConstraint.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
    expect(db.bookletConstraint.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { isActive: true },
    });
  });

  it("deactivates active constraint without touching others", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findUnique).mockResolvedValue({
      id: "c1",
      isActive: true,
    } as never);
    vi.mocked(db.bookletConstraint.update).mockResolvedValue({
      id: "c1",
      isActive: false,
    } as never);

    const result = await toggleConstraintActive("c1");

    expect(result.success).toBe(true);
    expect(db.bookletConstraint.updateMany).not.toHaveBeenCalled();
    expect(db.bookletConstraint.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { isActive: false },
    });
  });

  it("returns error when constraint not found", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findUnique).mockResolvedValue(null);

    const result = await toggleConstraintActive("nonexistent");

    expect(result.error).toBe("Constraint not found");
  });

  it("returns error when toggle fails", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findUnique).mockResolvedValue({
      id: "c1",
      isActive: true,
    } as never);
    vi.mocked(db.bookletConstraint.update).mockRejectedValue(
      new Error("DB error"),
    );

    const result = await toggleConstraintActive("c1");

    expect(result.error).toBe("Failed to toggle constraint");
  });
});
