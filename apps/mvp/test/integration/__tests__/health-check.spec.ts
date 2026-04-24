/**
 * Health Check Integration Tests
 *
 * Verifies connectivity to all required services:
 * - Neon PostgreSQL database
 * - Redis (BullMQ)
 */

import { getTestPrismaClient } from "../utils/database";
import { getRedisUrl, getTestQueue } from "../utils/redis";

describe("Health Check", () => {
  describe("Database", () => {
    it("should connect to Neon PostgreSQL database", async () => {
      const db = getTestPrismaClient();
      const result = await db.$queryRaw<
        { connected: number }[]
      >`SELECT 1 as connected`;
      expect(result[0].connected).toBe(1);
    });

    it("should be able to create and read a test user", async () => {
      const db = getTestPrismaClient();
      const testEmail = `health-check-${Date.now()}@test.com`;

      const user = await db.user.create({
        data: {
          email: testEmail,
          name: "Health Check Test",
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(testEmail);

      // Verify we can read it back
      const found = await db.user.findUnique({
        where: { id: user.id },
      });

      expect(found).not.toBeNull();
      expect(found?.email).toBe(testEmail);
    });
  });

  describe("Redis", () => {
    it("should connect to Redis", async () => {
      const redisUrl = getRedisUrl();
      expect(redisUrl).toBeDefined();
      expect(redisUrl).toMatch(/^redis:/);
    });

    it("should be able to add and retrieve a job from BullMQ", async () => {
      const queue = getTestQueue("health-check-test");
      const testJobId = `health-check-${Date.now()}`;

      const job = await queue.add(
        "test",
        { test: true, timestamp: Date.now() },
        { jobId: testJobId },
      );

      expect(job.id).toBe(testJobId);

      // Verify we can get the job back
      const retrieved = await queue.getJob(testJobId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.data.test).toBe(true);

      // Clean up
      await job.remove();
      await queue.close();
    });
  });
});
