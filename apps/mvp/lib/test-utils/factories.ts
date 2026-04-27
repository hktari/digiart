import type {
  BookletConstraint,
  PodOffering,
  PricingQuoteSnapshot,
  SubscriptionCycle,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";

/**
 * Test data factories for creating mock objects
 */

export function createTestCycle(
  overrides?: Partial<SubscriptionCycle>,
): SubscriptionCycle {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return {
    id: `test-cycle-${Date.now()}`,
    label: `Test Cycle ${month}/${year}`,
    month,
    year,
    selectionOpenDate: new Date(year, month - 1, 1),
    lockDate: new Date(year, month - 1, 23),
    fulfillmentDate: new Date(year, month, 1),
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTestConstraint(
  overrides?: Partial<BookletConstraint>,
): BookletConstraint {
  const now = new Date();

  return {
    id: `test-constraint-${Date.now()}`,
    minPages: 30,
    maxPages: 50,
    maxCreators: null,
    maxReleases: null,
    isActive: true,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTestOffering(
  overrides?: Partial<PodOffering>,
): PodOffering {
  const now = new Date();

  return {
    id: `test-offering-${Date.now()}`,
    providerId: "test-provider-1",
    externalId: `peecho-${Date.now()}`,
    name: "Test Softcover Booklet",
    minPages: 20,
    maxPages: 100,
    widthMm: 210,
    heightMm: 297,
    pricingMeta: null,
    isActive: true,
    syncedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTestQuote(
  overrides?: Partial<PricingQuoteSnapshot>,
): PricingQuoteSnapshot {
  const now = new Date();

  return {
    id: `test-quote-${Date.now()}`,
    collectorProfileId: "test-collector-1",
    cycleId: "test-cycle-1",
    offeringId: "test-offering-1",
    country: "US",
    requestedPageCount: 30,
    shippingAmount: new Decimal(5.0),
    productAmount: new Decimal(12.5),
    taxAmount: new Decimal(1.75),
    totalEstimate: new Decimal(19.25),
    currency: "USD",
    quotedAt: now,
    ...overrides,
  };
}

/**
 * Helper to create a cycle in a specific status
 */
export function createCycleWithStatus(
  status: "OPEN" | "LOCKED" | "PROCESSING" | "COMPLETE",
): SubscriptionCycle {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  switch (status) {
    case "OPEN":
      return createTestCycle({
        selectionOpenDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        lockDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Always future
        fulfillmentDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        status: "OPEN",
      });
    case "LOCKED":
      return createTestCycle({
        selectionOpenDate: new Date(year, month - 1, 1),
        lockDate: new Date(year, month, 1), // Past
        fulfillmentDate: new Date(year, month, 25), // Future
        status: "LOCKED",
      });
    case "PROCESSING":
      return createTestCycle({
        selectionOpenDate: new Date(year, month - 1, 1),
        lockDate: new Date(year, month - 1, 23),
        fulfillmentDate: new Date(year, month, 1), // Today
        status: "PROCESSING",
      });
    case "COMPLETE":
      return createTestCycle({
        selectionOpenDate: new Date(year, month - 2, 1),
        lockDate: new Date(year, month - 2, 23),
        fulfillmentDate: new Date(year, month - 1, 1), // Past
        status: "COMPLETE",
      });
  }
}
