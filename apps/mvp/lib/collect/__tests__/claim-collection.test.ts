import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    collection: { findUnique: vi.fn(), update: vi.fn() },
    lead: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/s3", () => ({ deleteStorageObject: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

const TOKEN = "tok_abc123";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";

describe("claimCollection", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never);

    const { db } = await import("@/lib/db");
    vi.mocked(db.collection.findUnique).mockResolvedValue({
      id: "col-1",
      token: TOKEN,
      collectorLeadId: LEAD_ID,
      ownerUserId: null,
    } as never);
    vi.mocked(db.collection.update).mockResolvedValue({} as never);
    vi.mocked(db.lead.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.lead.update).mockResolvedValue({} as never);
  });

  it("links the collection and advances the collector lead", async () => {
    const { claimCollection } = await import("../actions");
    const { db } = await import("@/lib/db");

    await claimCollection(TOKEN);

    expect(db.collection.update).toHaveBeenCalledWith({
      where: { token: TOKEN },
      data: { ownerUserId: USER_ID },
    });
    expect(db.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LEAD_ID },
        data: expect.objectContaining({
          status: "SIGNED_UP",
          ownerUserId: USER_ID,
        }),
      }),
    );
  });

  it("still advances the lead when the user already owns another one", async () => {
    // Lead.ownerUserId is unique across ALL leads, so a user who claimed a
    // creator lead at /claim/<handle> cannot also own their collector lead.
    // Linking unconditionally threw, leaving the collection claimed and the
    // lead stuck at NEW — the funnel's own conversion metric never moved.
    const { claimCollection } = await import("../actions");
    const { db } = await import("@/lib/db");
    vi.mocked(db.lead.findUnique).mockResolvedValue({
      id: "some-other-lead",
      ownerUserId: USER_ID,
    } as never);

    await claimCollection(TOKEN);

    expect(db.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LEAD_ID },
        data: expect.objectContaining({
          status: "SIGNED_UP",
          ownerUserId: undefined,
        }),
      }),
    );
  });

  it("keeps the collection claimed even if the lead write fails", async () => {
    const { claimCollection } = await import("../actions");
    const { db } = await import("@/lib/db");
    vi.mocked(db.lead.update).mockRejectedValue(new Error("unique violation"));

    await expect(claimCollection(TOKEN)).resolves.toBeUndefined();
    expect(db.collection.update).toHaveBeenCalled();
  });

  it("does nothing without a session", async () => {
    const { claimCollection } = await import("../actions");
    const { auth } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(auth).mockResolvedValue(null as never);

    await claimCollection(TOKEN);

    expect(db.collection.update).not.toHaveBeenCalled();
  });

  it("is a no-op on an already-claimed collection", async () => {
    const { claimCollection } = await import("../actions");
    const { db } = await import("@/lib/db");
    vi.mocked(db.collection.findUnique).mockResolvedValue({
      id: "col-1",
      token: TOKEN,
      collectorLeadId: LEAD_ID,
      ownerUserId: "someone-else",
    } as never);

    await claimCollection(TOKEN);

    expect(db.collection.update).not.toHaveBeenCalled();
    expect(db.lead.update).not.toHaveBeenCalled();
  });
});
