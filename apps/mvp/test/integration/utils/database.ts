import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

/**
 * Test database utilities for integration tests.
 *
 * Uses a separate PrismaClient for tests to allow proper cleanup
 * without affecting the global app client.
 */

let testPrismaClient: PrismaClient | null = null;

/**
 * Get or create a test PrismaClient
 */
export function getTestPrismaClient(): PrismaClient {
  if (testPrismaClient) {
    return testPrismaClient;
  }

  const connectionString =
    process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_TEST or DATABASE_URL environment variable is not set",
    );
  }

  const adapter = new PrismaNeon({ connectionString });

  testPrismaClient = new PrismaClient({
    adapter,
    log:
      process.env.DEBUG_TESTS === "true"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  return testPrismaClient;
}

/**
 * Cleanup function to delete test data.
 * Deletes entities created during tests in reverse dependency order.
 */
export async function cleanupTestData(): Promise<void> {
  const db = getTestPrismaClient();

  try {
    // Delete in reverse dependency order to avoid FK constraints
    await db.$transaction([
      // PDF generation data
      db.generatedPrintFile.deleteMany(),
      db.pricingQuoteSnapshot.deleteMany(),

      // Collector selections and subscriptions
      db.collectorReleaseSelection.deleteMany(),
      db.collectorCreatorSubscription.deleteMany(),

      // Release data
      db.releaseArtwork.deleteMany(),
      db.releaseTag.deleteMany(),
      db.tag.deleteMany(),
      db.release.deleteMany(),

      // Subscription cycles
      db.subscriptionCycle.deleteMany(),

      // Artworks
      db.artwork.deleteMany(),

      // Creator profiles
      db.creatorPayoutProfile.deleteMany(),
      db.creatorSocialLink.deleteMany(),
      db.creatorProfile.deleteMany(),

      // Collector profiles
      db.collectorProfile.deleteMany(),

      // Notifications
      db.emailNotificationLog.deleteMany(),
      db.notificationPreference.deleteMany(),

      // Auth
      db.userRole.deleteMany(),
      db.session.deleteMany(),
      db.account.deleteMany(),
      db.verificationToken.deleteMany(),

      // Users (delete last)
      db.user.deleteMany(),
    ]);

    console.log("✓ Test data cleaned up");
  } catch (error) {
    console.error("Failed to cleanup test data:", error);
    throw error;
  }
}

/**
 * Close the test PrismaClient connection
 */
export async function closeTestPrismaClient(): Promise<void> {
  if (testPrismaClient) {
    await testPrismaClient.$disconnect();
    testPrismaClient = null;
  }
}

/**
 * Execute a function within a transaction that rolls back after.
 * Useful for tests that need isolation but don't want to cleanup manually.
 */
export async function withTransaction<T>(
  fn: (db: PrismaClient) => Promise<T>,
): Promise<T> {
  const db = getTestPrismaClient();

  // Note: Prisma doesn't support nested transactions well.
  // For tests, we use cleanup instead of rollback.
  try {
    const result = await fn(db);
    return result;
  } finally {
    // Cleanup is handled by global afterEach
  }
}
