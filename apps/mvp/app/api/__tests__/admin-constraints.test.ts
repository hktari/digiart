import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../admin/booklet-constraints/route";

vi.mock("@/lib/db", () => ({
  db: {
    bookletConstraint: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/roles", () => ({
  requireAdmin: vi.fn(),
}));

async function makeAdminAuth() {
  const { requireAdmin } = await import("@/lib/roles");
  vi.mocked(requireAdmin).mockResolvedValue("admin-1");
}

async function makeUnauthorizedAuth() {
  const { requireAdmin } = await import("@/lib/roles");
  vi.mocked(requireAdmin).mockImplementation(() => {
    throw new Error("NEXT_REDIRECT: /");
  });
}

describe("GET /api/admin/booklet-constraints", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await makeAdminAuth();
  });

  it("returns all constraints ordered by version desc", async () => {
    const { db } = await import("@/lib/db");

    const constraints = [
      { id: "c2", minPages: 25, maxPages: 60, isActive: true, version: 2 },
      { id: "c1", minPages: 30, maxPages: 50, isActive: false, version: 1 },
    ];
    vi.mocked(db.bookletConstraint.findMany).mockResolvedValue(
      constraints as never,
    );

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(constraints);
    expect(db.bookletConstraint.findMany).toHaveBeenCalledWith({
      orderBy: { version: "desc" },
    });
  });

  it("returns 401 when not admin", async () => {
    await makeUnauthorizedAuth();

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/booklet-constraints", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await makeAdminAuth();
  });

  it("creates constraint and assigns next version", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue({
      version: 3,
    } as never);
    vi.mocked(db.bookletConstraint.updateMany).mockResolvedValue({ count: 0 });
    const newConstraint = {
      id: "c4",
      minPages: 20,
      maxPages: 60,
      isActive: false,
      version: 4,
    };
    vi.mocked(db.bookletConstraint.create).mockResolvedValue(
      newConstraint as never,
    );

    const req = new Request("http://localhost/api/admin/booklet-constraints", {
      method: "POST",
      body: JSON.stringify({ minPages: 20, maxPages: 60, isActive: false }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.version).toBe(4);
    expect(db.bookletConstraint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ version: 4 }),
    });
  });

  it("deactivates existing constraints when creating active one", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue(null);
    vi.mocked(db.bookletConstraint.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(db.bookletConstraint.create).mockResolvedValue({
      id: "c1",
      version: 1,
    } as never);

    const req = new Request("http://localhost/api/admin/booklet-constraints", {
      method: "POST",
      body: JSON.stringify({ minPages: 20, maxPages: 60, isActive: true }),
    });

    await POST(req);

    expect(db.bookletConstraint.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
  });

  it("returns 400 when minPages >= maxPages", async () => {
    const req = new Request("http://localhost/api/admin/booklet-constraints", {
      method: "POST",
      body: JSON.stringify({ minPages: 60, maxPages: 20 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields missing", async () => {
    const req = new Request("http://localhost/api/admin/booklet-constraints", {
      method: "POST",
      body: JSON.stringify({ minPages: 20 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
