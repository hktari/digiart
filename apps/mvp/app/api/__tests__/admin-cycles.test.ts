import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET as GET_ONE, PATCH } from "../admin/cycles/[id]/route";
import { GET, POST } from "../admin/cycles/route";

vi.mock("@/lib/db", () => ({
  db: {
    subscriptionCycle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/roles", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

async function makeAdminAuth() {
  const { requireAdmin } = await import("@/lib/roles");
  vi.mocked(requireAdmin).mockResolvedValue("admin-1");
}

async function makeUnauthorizedAuth() {
  const { requireAdmin } = await import("@/lib/roles");
  vi.mocked(requireAdmin).mockImplementation(() => {
    throw new Error("NEXT_REDIRECT: /auth/sign-in");
  });
}

describe("GET /api/admin/cycles", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await makeAdminAuth();
  });

  it("returns list of cycles ordered by year and month desc", async () => {
    const { db } = await import("@/lib/db");

    const cycles = [
      { id: "cy2", label: "Feb 2025", month: 2, year: 2025, status: "LOCKED" },
      { id: "cy1", label: "Jan 2025", month: 1, year: 2025, status: "OPEN" },
    ];
    vi.mocked(db.subscriptionCycle.findMany).mockResolvedValue(cycles as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(cycles);
    expect(db.subscriptionCycle.findMany).toHaveBeenCalledWith({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  });

  it("returns 401 when not admin", async () => {
    await makeUnauthorizedAuth();

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });
});

describe("POST /api/admin/cycles", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await makeAdminAuth();
  });

  it("creates cycle with valid data", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);
    const newCycle = {
      id: "cy1",
      label: "March 2025",
      month: 3,
      year: 2025,
      status: "OPEN",
    };
    vi.mocked(db.subscriptionCycle.create).mockResolvedValue(newCycle as never);

    const req = new Request("http://localhost/api/admin/cycles", {
      method: "POST",
      body: JSON.stringify({
        label: "March 2025",
        month: 3,
        year: 2025,
        selectionOpenDate: "2025-03-01T00:00:00Z",
        lockDate: "2025-03-23T00:00:00Z",
        fulfillmentDate: "2025-04-01T00:00:00Z",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.label).toBe("March 2025");
  });

  it("returns 400 when cycle already exists for month/year", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "existing",
    } as never);

    const req = new Request("http://localhost/api/admin/cycles", {
      method: "POST",
      body: JSON.stringify({
        label: "Jan 2025",
        month: 1,
        year: 2025,
        selectionOpenDate: "2025-01-01T00:00:00Z",
        lockDate: "2025-01-23T00:00:00Z",
        fulfillmentDate: "2025-02-01T00:00:00Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid data (missing label)", async () => {
    const req = new Request("http://localhost/api/admin/cycles", {
      method: "POST",
      body: JSON.stringify({ label: "", month: 1, year: 2025 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when lockDate before selectionOpenDate", async () => {
    const req = new Request("http://localhost/api/admin/cycles", {
      method: "POST",
      body: JSON.stringify({
        label: "Jan 2025",
        month: 1,
        year: 2025,
        selectionOpenDate: "2025-01-25T00:00:00Z",
        lockDate: "2025-01-01T00:00:00Z",
        fulfillmentDate: "2025-02-01T00:00:00Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/cycles/[id]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await makeAdminAuth();
  });

  it("returns cycle by id with includes", async () => {
    const { db } = await import("@/lib/db");

    const cycle = {
      id: "cy1",
      label: "Jan 2025",
      month: 1,
      year: 2025,
      releases: [],
      selections: [],
    };
    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(
      cycle as never,
    );

    const req = new Request("http://localhost/api/admin/cycles/cy1");
    const res = await GET_ONE(req, { params: { id: "cy1" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("cy1");
  });

  it("returns 404 when cycle not found", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/cycles/nonexistent");
    const res = await GET_ONE(req, { params: { id: "nonexistent" } });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/cycles/[id]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await makeAdminAuth();
  });

  it("updates cycle status", async () => {
    const { db } = await import("@/lib/db");

    const updated = { id: "cy1", status: "LOCKED" };
    vi.mocked(db.subscriptionCycle.update).mockResolvedValue(updated as never);

    const req = new Request("http://localhost/api/admin/cycles/cy1", {
      method: "PATCH",
      body: JSON.stringify({ status: "LOCKED" }),
    });

    const res = await PATCH(req, { params: { id: "cy1" } });
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid status", async () => {
    const req = new Request("http://localhost/api/admin/cycles/cy1", {
      method: "PATCH",
      body: JSON.stringify({ status: "INVALID_STATUS" }),
    });

    const res = await PATCH(req, { params: { id: "cy1" } });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/cycles/[id]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await makeAdminAuth();
  });

  it("deletes cycle with no related data", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cy1",
      selections: [],
      releases: [],
    } as never);
    vi.mocked(db.subscriptionCycle.delete).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/admin/cycles/cy1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: { id: "cy1" } });

    expect(res.status).toBe(200);
  });

  it("returns 400 when cycle has related data", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue({
      id: "cy1",
      selections: [{ id: "s1" }],
      releases: [],
    } as never);

    const req = new Request("http://localhost/api/admin/cycles/cy1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: { id: "cy1" } });

    expect(res.status).toBe(400);
  });

  it("returns 404 when cycle not found", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.subscriptionCycle.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/cycles/nonexistent", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: { id: "nonexistent" } });

    expect(res.status).toBe(404);
  });
});
