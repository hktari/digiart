import { Queue } from "bullmq";

/**
 * Redis/BullMQ utilities for integration tests.
 */

const testQueues: Map<string, Queue> = new Map();
let redisUrl: string;

/**
 * Get the Redis connection URL for tests
 */
export function getRedisUrl(): string {
  if (!redisUrl) {
    redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  }
  return redisUrl;
}

/**
 * Create a test queue connection
 */
export function getTestQueue(name: string = "booklet-generation"): Queue {
  const existing = testQueues.get(name);
  if (existing) {
    return existing;
  }

  const queue = new Queue(name, {
    connection: { url: getRedisUrl() },
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 10,
    },
  });

  testQueues.set(name, queue);
  return queue;
}

/**
 * Cleanup test queues - removes all jobs from test queues
 */
export async function cleanupTestQueues(): Promise<void> {
  const toRemove: string[] = [];

  for (const [name, queue] of testQueues.entries()) {
    try {
      await queue.clean(0, 0, "completed");
      await queue.clean(0, 0, "failed");
      await queue.clean(0, 0, "wait");
      await queue.clean(0, 0, "delayed");
      await queue.clean(0, 0, "paused");
      await queue.obliterate({ force: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Connection is closed")) {
        toRemove.push(name);
      } else {
        console.error("Failed to cleanup test queues:", error);
        throw error;
      }
    }
  }

  for (const name of toRemove) {
    testQueues.delete(name);
  }

  console.log("✓ Test queues cleaned up");
}

/**
 * Close the test queue connection
 */
export async function closeTestQueue(): Promise<void> {
  for (const queue of testQueues.values()) {
    try {
      await queue.close();
    } catch {
      // ignore already-closed errors
    }
  }
  testQueues.clear();
}

/**
 * Wait for a job to complete with a timeout
 */
export async function waitForJobCompletion<T>(
  queue: Queue,
  jobId: string,
  timeoutMs: number = 30000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    if (state === "completed") {
      return job.returnvalue as T;
    }

    if (state === "failed") {
      throw new Error(`Job failed: ${job.failedReason}`);
    }

    await sleep(200);
  }

  throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
}

/**
 * Wait for a job to fail with a timeout
 */
export async function waitForJobFailure(
  queue: Queue,
  jobId: string,
  timeoutMs: number = 15000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    if (state === "failed") {
      return job.failedReason ?? "unknown error";
    }

    if (state === "completed") {
      throw new Error("Expected job to fail but it completed");
    }

    await sleep(200);
  }

  throw new Error(`Job ${jobId} did not fail within ${timeoutMs}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
