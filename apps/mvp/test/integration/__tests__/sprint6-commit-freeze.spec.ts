import { describe, expect, it } from "vitest";
import { createTestBookletScenario } from "../factories/cycle.factory";
import { getTestPrismaClient } from "../utils/database";

describe("Sprint 6: Commit & Freeze Flow", () => {
  it("end-to-end: create scenario, commit, freeze, verify snapshot is frozen", async () => {
    const db = getTestPrismaClient();

    // Phase 1: Create a complete booklet scenario
    const { cycle, collectorProfile, releases } =
      await createTestBookletScenario(db, {
        creatorCount: 2,
        artworksPerCreator: 3,
      });

    // Verify collector has selections
    const selections = await db.collectorReleaseSelection.findMany({
      where: { collectorProfileId: collectorProfile.id, cycleId: cycle.id },
    });
    expect(selections.length).toBe(2);

    // Phase 2: Mock auth and commit booklet
    vi.doMock("@/lib/auth", () => ({
      auth: () => Promise.resolve({ user: { id: collectorProfile.userId } }),
    }));

    const { commitBookletForCycle: commit } = await import(
      "@/lib/actions/collector"
    );
    const commitResult = await commit();

    expect(commitResult.success).toBe(true);
    if (commitResult.success) {
      expect(commitResult.checkoutIntent.id).toBeDefined();
    }

    // Verify CheckoutIntent exists
    const intent = await db.checkoutIntent.findUnique({
      where: {
        collectorProfileId_cycleId: {
          collectorProfileId: collectorProfile.id,
          cycleId: cycle.id,
        },
      },
    });
    expect(intent).not.toBeNull();
    expect(intent?.quoteInputCountry).toBe(collectorProfile.shippingCountry);

    // Phase 3: Freeze quotes
    const { freezeCollectorCycleQuotes: freeze } = await import(
      "@/lib/billing/freeze-service"
    );
    const freezeResult = await freeze(cycle.id);

    expect(freezeResult.frozen).toBeGreaterThanOrEqual(1);
    expect(freezeResult.errors).toEqual([]);

    // Verify PricingQuoteSnapshot is frozen
    const snapshot = await db.pricingQuoteSnapshot.findFirst({
      where: {
        collectorProfileId: collectorProfile.id,
        cycleId: cycle.id,
      },
      orderBy: { quotedAt: "desc" },
    });
    expect(snapshot).not.toBeNull();
    expect(snapshot?.isFrozen).toBe(true);
    expect(snapshot?.frozenAt).toBeInstanceOf(Date);
  }, 30000);
});
