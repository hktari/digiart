import { db } from "@/lib/db";

export interface PreLockReminderResult {
  notified: number;
  skipped: number;
}

/**
 * Logs COLLECTOR_AUTO_LOCK_REMINDER notification entries for passive collectors
 * (those without a manually placed order) who have selections for the given cycle.
 * Skips collectors who already have a reminder logged for this cycle.
 */
export async function sendPreLockReminders(
  cycleId: string,
): Promise<PreLockReminderResult> {
  const result: PreLockReminderResult = { notified: 0, skipped: 0 };

  const selectionsWithCollectors = await db.collectorReleaseSelection.findMany({
    where: { cycleId },
    select: {
      collectorProfileId: true,
      collectorProfile: {
        select: {
          userId: true,
        },
      },
    },
    distinct: ["collectorProfileId"],
  });

  if (selectionsWithCollectors.length === 0) {
    return result;
  }

  for (const record of selectionsWithCollectors) {
    const collectorId = record.collectorProfileId;
    const userId = record.collectorProfile.userId;

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
      result.skipped += 1;
      continue;
    }

    const alreadyNotified = await db.emailNotificationLog.findFirst({
      where: {
        userId,
        cycleId,
        type: "COLLECTOR_AUTO_LOCK_REMINDER",
      },
    });

    if (alreadyNotified) {
      result.skipped += 1;
      continue;
    }

    await db.emailNotificationLog.create({
      data: {
        userId,
        type: "COLLECTOR_AUTO_LOCK_REMINDER",
        cycleId,
        status: "PENDING",
      },
    });

    result.notified += 1;
  }

  return result;
}
