import { Queue } from "bullmq";
import { getFulfillmentEligibleCollectors } from "@/lib/billing/reconciliation-service";
import { db } from "@/lib/db";

function getBookletQueue() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Queue("booklet-generation", {
    connection: { url: redisUrl },
  });
}

interface PdfTriggerResult {
  enqueued: number;
  skipped: { collectorId: string; reason: string }[];
  errors: string[];
}

export async function triggerPdfGenerationForCycle(
  cycleId: string,
): Promise<PdfTriggerResult> {
  const result: PdfTriggerResult = {
    enqueued: 0,
    skipped: [],
    errors: [],
  };

  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
    select: { label: true, year: true },
  });

  if (!cycle) {
    result.errors.push(`Cycle ${cycleId} not found`);
    return result;
  }

  const issueLabel = `${cycle.label} ${cycle.year}`;
  const eligibleCollectors = await getFulfillmentEligibleCollectors(cycleId);
  const queue = getBookletQueue();

  for (const record of eligibleCollectors) {
    const collectorId = record.collectorProfile.id;

    try {
      const selections = await db.collectorReleaseSelection.findMany({
        where: {
          collectorProfileId: collectorId,
          cycleId,
        },
      });

      if (selections.length === 0) {
        result.skipped.push({
          collectorId,
          reason: "No selections",
        });
        continue;
      }

      const existingFile = await db.generatedPrintFile.findUnique({
        where: {
          collectorProfileId_cycleId: {
            collectorProfileId: collectorId,
            cycleId,
          },
        },
      });

      if (
        existingFile?.status === "READY" ||
        existingFile?.status === "GENERATING"
      ) {
        continue;
      }

      if (existingFile) {
        await db.generatedPrintFile.update({
          where: { id: existingFile.id },
          data: { status: "PENDING", errorMessage: null },
        });
      } else {
        await db.generatedPrintFile.create({
          data: {
            collectorProfileId: collectorId,
            cycleId,
            status: "PENDING",
          },
        });
      }

      await queue.add(
        "generate",
        { collectorProfileId: collectorId, cycleId, issueLabel },
        { jobId: `booklet-${collectorId}-${cycleId}` },
      );
      result.enqueued += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Collector ${collectorId}: ${message}`);
    }
  }

  await queue.close();

  return result;
}
