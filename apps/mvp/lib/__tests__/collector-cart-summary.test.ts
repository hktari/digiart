import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCollectorCartSummary } from "../actions/collector";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    collectorProfile: {
      findUnique: vi.fn(),
    },
    collectorCreatorSubscription: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    collectorReleaseSelection: {
      findMany: vi.fn(),
    },
    bookletConstraint: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../actions/cycles", () => ({
  getCurrentCycle: vi.fn(),
}));

describe("getCollectorCartSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses active booklet constraint range for checkout eligibility", async () => {
    const { db } = await import("@/lib/db");
    const { getCurrentCycle } = await import("../actions/cycles");

    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
    } as never);

    vi.mocked(getCurrentCycle).mockResolvedValue({ id: "cycle-1" } as never);

    vi.mocked(db.collectorCreatorSubscription.count).mockResolvedValue(0);
    vi.mocked(db.collectorCreatorSubscription.findMany).mockResolvedValue([]);
    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue({
      minPages: 40,
      maxPages: 60,
    } as never);

    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      {
        releaseId: "release-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        release: {
          title: "Issue 01",
          creatorProfile: {
            id: "creator-1",
            displayName: "Creator One",
            slug: "creator-one",
          },
          _count: {
            artworks: 35,
          },
        },
      },
    ] as never);

    const summary = await getCollectorCartSummary("user-1");

    expect(summary.totalArtworks).toBe(35);
    expect(summary.minRequired).toBe(40);
    expect(summary.maxAllowed).toBe(60);
    expect(summary.artworksNeeded).toBe(5);
    expect(summary.isValidArtworkRange).toBe(false);
    expect(summary.isValidSubscribedCreatorRange).toBe(false);
    expect(summary.isValidForCheckout).toBe(false);
  });

  it("falls back to default range when no active constraint exists", async () => {
    const { db } = await import("@/lib/db");
    const { getCurrentCycle } = await import("../actions/cycles");

    vi.mocked(db.collectorProfile.findUnique).mockResolvedValue({
      id: "collector-1",
    } as never);

    vi.mocked(getCurrentCycle).mockResolvedValue({ id: "cycle-1" } as never);
    vi.mocked(db.collectorCreatorSubscription.count).mockResolvedValue(0);
    vi.mocked(db.collectorCreatorSubscription.findMany).mockResolvedValue([]);
    vi.mocked(db.bookletConstraint.findFirst).mockResolvedValue(null);

    vi.mocked(db.collectorReleaseSelection.findMany).mockResolvedValue([
      {
        releaseId: "release-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        release: {
          title: "Issue 01",
          creatorProfile: {
            id: "creator-1",
            displayName: "Creator One",
            slug: "creator-one",
          },
          _count: {
            artworks: 18,
          },
        },
      },
    ] as never);

    const summary = await getCollectorCartSummary("user-1");

    expect(summary.minRequired).toBe(18);
    expect(summary.maxAllowed).toBe(500);
    expect(summary.isValidArtworkRange).toBe(true);
    expect(summary.isValidForCheckout).toBe(true);
  });
});
