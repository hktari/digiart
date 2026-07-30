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
      email: "saved@example.com",
      _count: { items: 4 },
    } as never);
    vi.mocked(db.collection.update).mockResolvedValue({} as never);
    vi.mocked(db.lead.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.lead.update).mockResolvedValue({} as never);

    const { sendEmail } = await import("@/lib/email");
    vi.mocked(sendEmail).mockResolvedValue({ sent: true });
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

  describe("reservation confirmation", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = "https://app.printfeed.example";
    });

    it("confirms the reservation and is explicit that nothing was charged", async () => {
      // The page can only reserve — no quote, no payment, no print job. An
      // unqualified confirmation would repeat the promise this funnel could
      // not keep.
      const { claimCollection } = await import("../actions");
      const { sendEmail } = await import("@/lib/email");

      await claimCollection(TOKEN);

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const [args] = vi.mocked(sendEmail).mock.calls[0];
      expect(args.to).toBe("saved@example.com");
      expect(args.text).toContain("Nothing has been charged");
      expect(args.text).toContain(`https://app.printfeed.example/c/${TOKEN}`);
      // 1200 + 4 * 150 = 1800
      expect(args.text).toContain("€18.00");
    });

    it("falls back to the signed-in account when no email was saved", async () => {
      const { claimCollection } = await import("../actions");
      const { auth } = await import("@/lib/auth");
      const { db } = await import("@/lib/db");
      const { sendEmail } = await import("@/lib/email");

      vi.mocked(auth).mockResolvedValue({
        user: { id: USER_ID, email: "account@example.com" },
      } as never);
      vi.mocked(db.collection.findUnique).mockResolvedValue({
        id: "col-1",
        token: TOKEN,
        collectorLeadId: LEAD_ID,
        ownerUserId: null,
        email: null,
        _count: { items: 1 },
      } as never);

      await claimCollection(TOKEN);

      expect(vi.mocked(sendEmail).mock.calls[0][0].to).toBe(
        "account@example.com",
      );
    });

    it("keeps the reservation when the confirmation cannot be sent", async () => {
      const { claimCollection } = await import("../actions");
      const { db } = await import("@/lib/db");
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({ sent: false, error: "down" });

      await expect(claimCollection(TOKEN)).resolves.toBeUndefined();
      expect(db.collection.update).toHaveBeenCalled();
    });
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
