import { Queue } from "bullmq";

function getAutoAssignQueue() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Queue("release-auto-assignment", {
    connection: { url: redisUrl },
  });
}

export interface AutoAssignJobData {
  releaseId: string;
  creatorProfileId: string;
  cycleId: string;
}

export async function enqueueAutoAssignRelease(
  data: AutoAssignJobData,
): Promise<string> {
  const queue = getAutoAssignQueue();
  const job = await queue.add("auto-assign", data, {
    jobId: `auto-assign-${data.releaseId}`,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
  await queue.close();
  return job.id as string;
}
