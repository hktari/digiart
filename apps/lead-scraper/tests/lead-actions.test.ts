import { describe, expect, it, vi } from "vitest";
import {
  archiveLead,
  LeadNotFoundError,
  markCarded,
  markContacted,
  markIrrelevant,
  selectLeadsForCards,
} from "../src/lib/lead-actions.js";

function stubPrisma(lead: unknown = { id: "l1", painPoints: [] }) {
  return {
    lead: {
      findUnique: vi.fn().mockResolvedValue(lead),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockImplementation(({ data }) => ({ id: "l1", ...data })),
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal Prisma stub
  } as any;
}

describe("markContacted", () => {
  it("sets reachedOut and a timestamp", async () => {
    const result = await markContacted(stubPrisma(), "l1", "sent DM");

    expect(result.reachedOut).toBe(true);
    expect(result.reachedOutAt).toBeInstanceOf(Date);
    expect(result.outreachNotes).toBe("sent DM");
  });

  it("stores null notes when none given", async () => {
    const result = await markContacted(stubPrisma(), "l1");
    expect(result.outreachNotes).toBeNull();
  });

  it("throws LeadNotFoundError for an unknown id", async () => {
    await expect(
      markContacted(stubPrisma(null), "nope"),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
  });
});

describe("markIrrelevant", () => {
  it("sets the irrelevance fields and attributes them to the user", async () => {
    const result = await markIrrelevant(stubPrisma(), "l1", "not an artist");

    expect(result.isIrrelevant).toBe(true);
    expect(result.irrelevanceReason).toBe("not an artist");
    expect(result.markedIrrelevantBy).toBe("user");
    expect(result.markedIrrelevantAt).toBeInstanceOf(Date);
  });
});

describe("archiveLead", () => {
  it("soft deletes with a timestamp", async () => {
    const result = await archiveLead(stubPrisma(), "l1");

    expect(result.archived).toBe(true);
    expect(result.archivedAt).toBeInstanceOf(Date);
  });
});

describe("selectLeadsForCards", () => {
  it("filters on score, uncarded, not irrelevant, not archived", async () => {
    const prisma = stubPrisma();
    await selectLeadsForCards(prisma, { minScore: 60, limit: 10 });

    const { where } = prisma.lead.findMany.mock.calls[0][0];
    expect(where.score).toEqual({ gte: 60 });
    expect(where.notifiedAt).toBeNull();
    expect(where.isIrrelevant).toBe(false);
    expect(where.archived).toBe(false);
  });

  it("excludes leads already reached out to", async () => {
    // notifiedAt was never written before cards existed, so every historical
    // lead reads as uncarded - including ones contacted from the web UI.
    const prisma = stubPrisma();
    await selectLeadsForCards(prisma, { minScore: 60, limit: 10 });

    const { where } = prisma.lead.findMany.mock.calls[0][0];
    expect(where.reachedOut).toBe(false);
  });

  it("orders by score descending and applies the cap", async () => {
    const prisma = stubPrisma();
    await selectLeadsForCards(prisma, { minScore: 60, limit: 10 });

    const args = prisma.lead.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ score: "desc" });
    expect(args.take).toBe(10);
  });
});

describe("markCarded", () => {
  it("stamps notifiedAt so the lead is never carded twice", async () => {
    const prisma = stubPrisma();
    await markCarded(prisma, "l1");

    const { where, data } = prisma.lead.update.mock.calls[0][0];
    expect(where).toEqual({ id: "l1" });
    expect(data.notifiedAt).toBeInstanceOf(Date);
  });
});
