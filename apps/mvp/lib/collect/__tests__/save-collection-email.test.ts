import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    collection: { findUnique: vi.fn(), update: vi.fn() },
    lead: { update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

// actions.ts also hosts claimCollection/removeCollectionItem, so importing it
// drags in next-auth and the S3 client. Neither is on this path; stubbing them
// keeps the module loadable under vitest.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/s3", () => ({ deleteStorageObject: vi.fn() }));

const TOKEN = "tok_abc123";

function formWith(email: string): FormData {
  const form = new FormData();
  form.set("email", email);
  return form;
}

describe("saveCollectionEmail", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.printfeed.example";

    const { db } = await import("@/lib/db");
    vi.mocked(db.collection.findUnique).mockResolvedValue({
      id: "col-1",
      token: TOKEN,
      collectorLeadId: "lead-1",
      _count: { items: 4 },
    } as never);
    vi.mocked(db.collection.update).mockResolvedValue({} as never);
    vi.mocked(db.lead.update).mockResolvedValue({} as never);

    const { sendEmail } = await import("@/lib/email");
    vi.mocked(sendEmail).mockResolvedValue({ sent: true });
  });

  it("emails the collector the link it promised", async () => {
    const { saveCollectionEmail } = await import("../actions");
    const { sendEmail } = await import("@/lib/email");

    await saveCollectionEmail(TOKEN, null, formWith("Collector@Example.com"));

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [args] = vi.mocked(sendEmail).mock.calls[0];
    expect(args.to).toBe("collector@example.com");
    // The whole point of the capture is that the link is portable — it has to
    // be in the message, absolute, or the email is useless.
    expect(args.html).toContain(`https://app.printfeed.example/c/${TOKEN}`);
    expect(args.text).toContain(`https://app.printfeed.example/c/${TOKEN}`);
    expect(args.text).toContain("4 pieces");
  });

  it("saves the email before sending, so a send failure still captures the lead", async () => {
    const { saveCollectionEmail } = await import("../actions");
    const { db } = await import("@/lib/db");
    const { sendEmail } = await import("@/lib/email");
    vi.mocked(sendEmail).mockResolvedValue({
      sent: false,
      error: "resend down",
    });

    const result = await saveCollectionEmail(
      TOKEN,
      null,
      formWith("collector@example.com"),
    );

    expect(db.collection.update).toHaveBeenCalledWith({
      where: { token: TOKEN },
      data: { email: "collector@example.com" },
    });
    expect(db.lead.update).toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("reports success back to the form", async () => {
    const { saveCollectionEmail } = await import("../actions");

    const result = await saveCollectionEmail(
      TOKEN,
      null,
      formWith("collector@example.com"),
    );

    expect(result.status).toBe("sent");
  });

  it("rejects a malformed address without touching the database", async () => {
    const { saveCollectionEmail } = await import("../actions");
    const { db } = await import("@/lib/db");
    const { sendEmail } = await import("@/lib/email");

    const result = await saveCollectionEmail(TOKEN, null, formWith("nope"));

    expect(result.status).toBe("invalid");
    expect(db.collection.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reports a missing collection rather than silently succeeding", async () => {
    const { saveCollectionEmail } = await import("../actions");
    const { db } = await import("@/lib/db");
    vi.mocked(db.collection.findUnique).mockResolvedValue(null as never);

    const result = await saveCollectionEmail(
      TOKEN,
      null,
      formWith("collector@example.com"),
    );

    expect(result.status).toBe("error");
  });
});
