/**
 * Global setup for integration tests.
 *
 * This file runs before all tests to:
 * 1. Connect to the test database (Neon test branch)
 * 2. Set up Redis connection
 * 3. Initialize mock S3 storage
 * 4. Configure environment variables
 */

import { vi } from "vitest";
import {
  cleanupTestData,
  closeTestPrismaClient,
  getTestPrismaClient,
} from "./utils/database";
import { cleanupTestQueues, closeTestQueue } from "./utils/redis";
import { cleanupMockS3, initMockS3 } from "./utils/s3-mock";

// Global test timeout - allow longer for full stack tests
vi.setConfig({ testTimeout: 60000 });

// Set up test environment
beforeAll(async () => {
  console.log("\n🔧 Setting up integration test environment...\n");

  // Verify required environment variables
  const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL_TEST or DATABASE_URL environment variable is required.\n" +
        "Example: DATABASE_URL_TEST=postgresql://user:pass@host/test-db?sslmode=require",
    );
  }

  console.log("📡 Database:", databaseUrl.replace(/:[^:]*@/, ":****@"));
  console.log("📡 Redis:", redisUrl);

  // Set storage to local for mocking
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_PATH =
    process.env.STORAGE_LOCAL_PATH || "/tmp/test-uploads";
  process.env.AWS_S3_BUCKET = "test-bucket";
  process.env.AWS_REGION = "eu-west-1";

  // 1. Connect to test database
  const db = getTestPrismaClient();
  await db.$connect();

  // Verify database connection
  const result = await db.$queryRaw<
    { connected: number }[]
  >`SELECT 1 as connected`;
  if (result[0]?.connected !== 1) {
    throw new Error("Failed to connect to test database");
  }
  console.log("✓ Database connected");

  // 2. Initialize mock S3 storage
  await initMockS3();
  console.log(
    "✓ Mock S3 storage initialized at",
    process.env.STORAGE_LOCAL_PATH,
  );

  // 3. Redis connection will be lazily initialized by tests
  console.log("✓ Redis URL configured");

  console.log("\n✅ Integration test environment ready\n");
});

// Clean up after each test to ensure isolation
afterEach(async () => {
  try {
    await cleanupTestData();
  } catch (error) {
    console.error("Failed to cleanup test data:", error);
    throw error;
  }

  try {
    await cleanupTestQueues();
  } catch (error) {
    console.error("Failed to cleanup test queues:", error);
    throw error;
  }

  try {
    await cleanupMockS3();
  } catch (error) {
    console.error("Failed to cleanup mock S3:", error);
    throw error;
  }
});

// Global teardown
afterAll(async () => {
  console.log("\n🧹 Cleaning up integration test environment...\n");

  // Close database connection
  await closeTestPrismaClient();
  console.log("✓ Database connection closed");

  // Close Redis connection
  await closeTestQueue();
  console.log("✓ Redis connection closed");

  console.log("\n✅ Integration test environment cleaned up\n");
});
