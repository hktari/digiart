import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type {
  AutoAssignJobData,
  AutoAssignJobResult,
} from "./auto-assign.types";

@Processor("release-auto-assignment")
export class AutoAssignProcessor extends WorkerHost {
  private readonly logger = new Logger(AutoAssignProcessor.name);
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  async process(job: Job<AutoAssignJobData>): Promise<AutoAssignJobResult> {
    const { releaseId, creatorProfileId, cycleId } = job.data;
    this.logger.log(
      `Processing auto-assign job ${job.id} for release=${releaseId} creator=${creatorProfileId} cycle=${cycleId}`,
    );

    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
      include: {
        _count: {
          select: { artworks: true },
        },
      },
    });

    if (!release || release.status !== "PUBLISHED") {
      this.logger.warn(`Release ${releaseId} not found or not published`);
      return { assignedCount: 0, skippedAtLimitCount: 0 };
    }

    const activeConstraint = await this.prisma.bookletConstraint.findFirst({
      where: { isActive: true },
      select: { minPages: true, maxPages: true },
    });

    const maxAllowed = activeConstraint?.maxPages ?? 100;

    const subscriptions =
      await this.prisma.collectorCreatorSubscription.findMany({
        where: {
          creatorProfileId,
          isActive: true,
        },
        select: {
          collectorProfile: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

    let assignedCount = 0;
    let skippedAtLimitCount = 0;
    const notifiedUserIds: string[] = [];

    for (const subscription of subscriptions) {
      const collectorProfileId = subscription.collectorProfile.id;

      const existingSelection =
        await this.prisma.collectorReleaseSelection.findUnique({
          where: {
            collectorProfileId_releaseId_cycleId: {
              collectorProfileId,
              releaseId,
              cycleId,
            },
          },
          select: { id: true },
        });

      if (existingSelection) {
        continue;
      }

      const selections = await this.prisma.collectorReleaseSelection.findMany({
        where: { collectorProfileId, cycleId },
        select: {
          release: {
            select: {
              _count: {
                select: { artworks: true },
              },
            },
          },
        },
      });

      const currentArtworkCount = selections.reduce(
        (total, s) => total + s.release._count.artworks,
        0,
      );
      const projectedArtworkCount =
        currentArtworkCount + release._count.artworks;

      if (projectedArtworkCount > maxAllowed) {
        skippedAtLimitCount += 1;
        continue;
      }

      await this.prisma.collectorReleaseSelection.create({
        data: {
          collectorProfileId,
          releaseId,
          cycleId,
        },
      });

      assignedCount += 1;
      if (subscription.collectorProfile.userId) {
        notifiedUserIds.push(subscription.collectorProfile.userId);
      }
    }

    if (notifiedUserIds.length > 0) {
      await this.prisma.emailNotificationLog.createMany({
        data: notifiedUserIds.map((userId) => ({
          userId,
          type: "COLLECTOR_SELECTION_REMINDER" as const,
          cycleId,
          status: "PENDING" as const,
        })),
      });
    }

    this.logger.log(
      `Auto-assign complete: ${assignedCount} assigned, ${skippedAtLimitCount} skipped for release ${releaseId}`,
    );

    return { assignedCount, skippedAtLimitCount };
  }
}
