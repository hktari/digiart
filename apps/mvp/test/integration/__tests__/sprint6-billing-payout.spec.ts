import { describe, expect, it } from "vitest";
import { createTestBookletScenario } from "../factories/cycle.factory";
import { getTestPrismaClient } from "../utils/database";

describe("Sprint 6: Billing & Payout Flow", () => {
  it("charges frozen quote, marks PAID, then calculates creator earnings", async () => {
    const db = getTestPrismaClient();

    // Phase 1: Create scenario with frozen quote
    const { cycle, collectorProfile, creators, releases } =
      await createTestBookletScenario(db, {
        creatorCount: 2,
        artworksPerCreator: 3,
      });

    // Create a frozen quote snapshot
    const offering = await db.podOffering.findFirst();
    const quoteSnapshot = await db.pricingQuoteSnapshot.create({
      data: {
        collectorProfileId: collectorProfile.id,
        cycleId: cycle.id,
        offeringId: offering?.id,
        country: collectorProfile.shippingCountry ?? "US",
        requestedPageCount: 24,
        shippingAmount: 4.0,
        productAmount: 10.0,
        markupAmount: 5.0,
        taxAmount: 1.4,
        totalEstimate: 15.4,
        currency: "EUR",
        isFrozen: true,
        frozenAt: new Date(),
      },
    });

    // Phase 2: Create billing record and simulate PAID charge (mocked Stripe)
    const billingRecord = await db.billingRecord.create({
      data: {
        collectorProfileId: collectorProfile.id,
        cycleId: cycle.id,
        quoteSnapshotId: quoteSnapshot.id,
        amount: 15.4,
        currency: "EUR",
        status: "PENDING",
      },
    });

    // Simulate Stripe payment succeeded webhook
    await db.billingRecord.update({
      where: { id: billingRecord.id },
      data: {
        status: "PAID",
        stripePaymentIntentId: "pi_test_123",
        paidAt: new Date(),
      },
    });

    const updatedBilling = await db.billingRecord.findUnique({
      where: { id: billingRecord.id },
    });
    expect(updatedBilling?.status).toBe("PAID");

    // Phase 3: Create a fulfilled order so payout calculation sees eligible records
    await db.fulfillmentOrder.create({
      data: {
        collectorProfileId: collectorProfile.id,
        cycleId: cycle.id,
        generatedPrintFileId: "pf-test",
        quoteSnapshotId: quoteSnapshot.id,
        status: "SUBMITTED",
        providerOrderId: "12345",
        submittedAt: new Date(),
      },
    });

    // Phase 4: Calculate creator earnings
    const { calculateCreatorEarningsForCycle } = await import(
      "@/lib/billing/payout-service"
    );
    const result = await calculateCreatorEarningsForCycle(cycle.id);

    expect(result.paidCollectors).toBeGreaterThanOrEqual(1);
    expect(result.fulfilledCollectors).toBeGreaterThanOrEqual(1);
    expect(result.totalMarkupPool).toBeGreaterThan(0);
    expect(result.payouts.length).toBe(2);

    // Verify total payout equals markup pool (within rounding)
    const totalPayout = result.payouts.reduce(
      (sum: number, p: any) => sum + p.amount,
      0,
    );
    expect(totalPayout).toBeCloseTo(result.totalMarkupPool, 1);

    // Verify CreatorPayout records created in DB
    const dbPayouts = await db.creatorPayout.findMany({
      where: { cycleId: cycle.id },
    });
    expect(dbPayouts.length).toBe(2);
    expect(dbPayouts.every((p: any) => p.status === "PENDING")).toBe(true);
  }, 30000);
});
