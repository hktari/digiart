import { db } from "@/lib/db";

/**
 * Database test helpers
 */

/**
 * Clean up test data from database
 * Use this in afterEach or afterAll hooks
 */
export async function cleanupDatabase() {
  // Delete in order to respect foreign key constraints
  await db.pricingQuoteSnapshot.deleteMany({
    where: { collectorProfileId: { startsWith: "test-" } },
  });

  await db.podOffering.deleteMany({
    where: { id: { startsWith: "test-" } },
  });

  await db.bookletConstraint.deleteMany({
    where: { id: { startsWith: "test-" } },
  });

  await db.subscriptionCycle.deleteMany({
    where: { id: { startsWith: "test-" } },
  });
}

/**
 * Seed minimal test data
 */
export async function seedTestData() {
  // Create a test cycle
  const cycle = await db.subscriptionCycle.create({
    data: {
      id: "test-cycle-1",
      label: "Test Cycle",
      month: 1,
      year: 2025,
      selectionOpenDate: new Date("2025-01-01"),
      lockDate: new Date("2025-01-23"),
      fulfillmentDate: new Date("2025-02-01"),
      status: "OPEN",
    },
  });

  // Create a test constraint
  const constraint = await db.bookletConstraint.create({
    data: {
      id: "test-constraint-1",
      minPages: 18,
      maxPages: 500,
      isActive: true,
      version: 1,
    },
  });

  // Create a test POD provider
  const provider = await db.podProviderConfig.create({
    data: {
      id: "test-provider-1",
      provider: "Peecho",
      environment: "SANDBOX",
      isActive: true,
    },
  });

  // Create a test offering
  const offering = await db.podOffering.create({
    data: {
      id: "test-offering-1",
      providerId: provider.id,
      externalId: "peecho-test-1",
      name: "Test Softcover Booklet",
      minPages: 20,
      maxPages: 100,
      widthMm: 210,
      heightMm: 297,
      isActive: true,
      syncedAt: new Date(),
    },
  });

  return { cycle, constraint, provider, offering };
}

/**
 * Create a test user with specific role
 */
export async function createTestUser(
  role: "CREATOR" | "COLLECTOR" | "ADMIN" = "CREATOR",
) {
  const user = await db.user.create({
    data: {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
    },
  });

  await db.userRole.create({
    data: {
      userId: user.id,
      role,
    },
  });

  return user;
}

/**
 * Delete a test user and all related data
 */
export async function deleteTestUser(userId: string) {
  await db.userRole.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } });
}
