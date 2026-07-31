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
      // Skip collectors who already ordered manually — PDF generated at order time
      const intent = await db.checkoutIntent.findUnique({
        where: {
          collectorProfileId_cycleId: {
            collectorProfileId: collectorId,
            cycleId,
          },
        },
        select: { orderedManually: true },
      });
      if (intent?.orderedManually) {
        result.skipped.push({
          collectorId,
          reason: "Already ordered manually",
        });
        continue;
      }

      // Resolving artwork is the caller's job now. The worker used to run this
      // query itself, which was the only thing stopping a Collection from
      // using the same booklet pipeline.
      const selections = await db.collectorReleaseSelection.findMany({
        where: {
          collectorProfileId: collectorId,
          cycleId,
        },
        include: {
          release: {
            include: {
              artworks: {
                include: { artwork: true },
                orderBy: { sortOrder: "asc" },
              },
              creatorProfile: { select: { displayName: true } },
            },
          },
        },
      });

      if (selections.length === 0) {
        result.skipped.push({
          collectorId,
          reason: "No selections",
        });
        continue;
      }

      // The creator lives on the release, not the artwork, so it is stamped
      // onto each plate here — otherwise flattening loses which artist made
      // what, and every plate in a multi-creator booklet goes uncredited.
      const plates = selections.flatMap((selection) =>
        selection.release.artworks.map(({ artwork }) => ({
          id: artwork.id,
          title: artwork.title,
          storageKey: artwork.storageKey,
          mimeType: artwork.mimeType,
          width: artwork.width,
          height: artwork.height,
          orientation: artwork.orientation,
          creatorName: selection.release.creatorProfile.displayName,
        })),
      );

      if (plates.length === 0) {
        result.skipped.push({
          collectorId,
          reason: "Selections contain no artwork",
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

      // The worker keys its status writes on the row id, so the row has to
      // exist before the job is enqueued and its id has to travel with it.
      const printFile = existingFile
        ? await db.generatedPrintFile.update({
            where: { id: existingFile.id },
            data: { status: "PENDING", errorMessage: null },
          })
        : await db.generatedPrintFile.create({
            data: {
              collectorProfileId: collectorId,
              cycleId,
              status: "PENDING",
            },
          });

      await queue.add(
        "generate",
        { printFileId: printFile.id, issueLabel, plates },
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
