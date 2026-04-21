import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type { BookletJobData, BookletJobResult } from "./booklet.types";
import { PdfBuilderService } from "./pdf/pdf-builder.service";
import { StorageService } from "./storage/storage.service";

const MIN_WIDTH_PX = 1240;
const MIN_HEIGHT_PX = 1748;

@Processor("booklet-generation")
export class BookletProcessor extends WorkerHost {
  private readonly logger = new Logger(BookletProcessor.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly pdfBuilder: PdfBuilderService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<BookletJobData>): Promise<BookletJobResult> {
    const { collectorProfileId, cycleId, issueLabel } = job.data;
    this.logger.log(
      `Processing booklet job ${job.id} for collector=${collectorProfileId} cycle=${cycleId}`,
    );

    const selections = await this.prisma.collectorReleaseSelection.findMany({
      where: { collectorProfileId, cycleId },
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

    const artworks = selections.flatMap((sel: (typeof selections)[number]) =>
      sel.release.artworks.map(
        (ra: (typeof sel.release.artworks)[number]) => ra.artwork,
      ),
    );

    if (artworks.length === 0) {
      throw new Error("No artworks found for this collector/cycle combination");
    }

    for (const artwork of artworks) {
      if (
        !artwork.width ||
        !artwork.height ||
        artwork.orientation === "UNKNOWN" ||
        artwork.width < MIN_WIDTH_PX ||
        artwork.height < MIN_HEIGHT_PX
      ) {
        throw new Error(
          `Artwork "${artwork.title}" (${artwork.id}) failed validation: orientation=${artwork.orientation}, dims=${artwork.width}×${artwork.height}`,
        );
      }
    }

    const imageBuffers = new Map<string, Buffer>();
    for (const artwork of artworks) {
      const storageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION ?? "eu-west-1"}.amazonaws.com/${artwork.storageKey}`;
      const res = await fetch(storageUrl);
      if (!res.ok) {
        throw new Error(
          `Failed to download artwork ${artwork.id} from ${storageUrl}: ${res.status}`,
        );
      }
      const arrayBuf = await res.arrayBuffer();
      imageBuffers.set(artwork.id, Buffer.from(arrayBuf));
    }

    const creatorNames: string[] = [
      ...new Set(
        selections.map(
          (s: (typeof selections)[number]) =>
            s.release.creatorProfile.displayName,
        ),
      ),
    ];

    const { bytes, pageCount } = await this.pdfBuilder.build(
      artworks,
      imageBuffers,
      issueLabel,
      creatorNames,
    );

    const pdfUrl = await this.storage.uploadPdf(bytes);
    this.logger.log(
      `Booklet job ${job.id} complete: ${pageCount} pages → ${pdfUrl}`,
    );

    return { pdfUrl, pageCount };
  }
}
