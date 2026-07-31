import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { gradePlate, plateDpi } from "@printfeed/print-geometry";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as Sentry from "@sentry/nestjs";
import type { Job } from "bullmq";
import type {
  BookletJobData,
  BookletJobResult,
  SkippedPlate,
} from "./booklet.types";
import { DEFAULT_PAGE_FORMAT, PAGE_DIMENSIONS } from "./booklet.types";
// Both of these are injected, so they must stay VALUE imports. `import type`
// is erased at compile time, leaving emitDecoratorMetadata with no class
// reference, and Nest then crashes at bootstrap with
// UnknownDependenciesException before the queue is ever consumed.
//
// Biome's style/useImportType reports them as "only used as types" and offers
// it as a *safe* fix, so `lint:format` will silently undo this. biome.json
// disables that rule for src/** — do not narrow that override.
import { PdfBuilderService } from "./pdf/pdf-builder.service";
import { StorageService } from "./storage/storage.service";

@Processor("booklet-generation")
export class BookletProcessor extends WorkerHost {
  private readonly logger = new Logger(BookletProcessor.name);
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  constructor(
    private readonly pdfBuilder: PdfBuilderService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<BookletJobData>): Promise<BookletJobResult> {
    const {
      printFileId,
      issueLabel,
      pageFormat = DEFAULT_PAGE_FORMAT,
      plates,
    } = job.data;
    this.logger.log(
      `Processing booklet job ${job.id} for printFile=${printFileId} (${plates.length} plates)`,
    );

    await this.prisma.generatedPrintFile.update({
      where: { id: printFileId },
      data: { status: "GENERATING", errorMessage: null },
    });

    try {
      const artworks = plates;

      if (artworks.length === 0) {
        throw new Error("Job payload carried no plates");
      }

      // A collection is 70+ pieces from strangers' phones; one under-floor
      // image must not take the whole booklet down with it. Drop it, print the
      // rest, and say exactly what fell out. An UNKNOWN orientation no longer
      // fails anything either — layoutPlate treats anything that is not
      // LANDSCAPE as portrait, which is the right fallback for an unknown.
      const page = PAGE_DIMENSIONS[pageFormat];
      const skipped: SkippedPlate[] = [];
      const marginal: string[] = [];
      const printable: typeof artworks = [];

      for (const artwork of artworks) {
        if (!artwork.width || !artwork.height) {
          skipped.push({
            id: artwork.id,
            title: artwork.title,
            dpi: 0,
            reason: "unmeasurable",
          });
          continue;
        }

        const plate = {
          imageWidthPx: artwork.width,
          imageHeightPx: artwork.height,
          orientation: artwork.orientation,
          page,
          hasCaption: true,
        };
        const grade = gradePlate(plate);

        if (grade === "REJECT") {
          skipped.push({
            id: artwork.id,
            title: artwork.title,
            dpi: Math.round(plateDpi(plate)),
            reason: "below-floor",
          });
          continue;
        }

        if (grade === "MARGINAL") marginal.push(artwork.id);
        printable.push(artwork);
      }

      if (printable.length === 0) {
        throw new Error(
          `No plates met the print floor: ${skipped.length} of ${artworks.length} were below it`,
        );
      }

      // Downloaded through the storage service, which signs the request. The
      // previous code fetched a hand-built
      // `<bucket>.s3.<region>.amazonaws.com` URL, which in production resolved
      // to nothing at all — storage is Tigris via AWS_ENDPOINT_URL, and the
      // bucket is private besides. Every job died here.
      const imageBuffers = new Map<string, Buffer>();
      for (const artwork of printable) {
        try {
          imageBuffers.set(
            artwork.id,
            await this.storage.downloadObject(artwork.storageKey),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(
            `Failed to download artwork ${artwork.id} (${artwork.storageKey}): ${message}`,
          );
        }
      }

      // The cover byline comes from whoever is actually in the book, which is
      // the printable set — an artist whose only plate was dropped should not
      // be credited on a cover they do not appear inside.
      const creatorNames: string[] = [
        ...new Set(
          printable
            .map((plate) => plate.creatorName)
            .filter((name): name is string => Boolean(name)),
        ),
      ];

      const { bytes, pageCount } = await this.pdfBuilder.build(
        printable,
        imageBuffers,
        issueLabel,
        creatorNames,
        pageFormat,
      );

      const pdfUrl = await this.storage.uploadPdf(bytes);
      this.logger.log(
        `Booklet job ${job.id} complete: ${pageCount} pages → ${pdfUrl}`,
      );

      const dims = PAGE_DIMENSIONS[pageFormat];
      const PT_TO_MM = 1 / 2.8346;
      const widthMm = dims.widthPt * PT_TO_MM;
      const heightMm = dims.heightPt * PT_TO_MM;

      await this.prisma.generatedPrintFile.update({
        where: { id: printFileId },
        data: {
          status: "READY",
          storageUrl: pdfUrl,
          pageCount,
          widthMm,
          heightMm,
          generatedAt: new Date(),
          errorMessage: null,
        },
      });

      return { pdfUrl, pageCount, skipped, marginal };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Booklet job ${job.id} failed: ${message}`);

      Sentry.captureException(error, {
        tags: { component: "booklet-processor" },
        extra: {
          jobId: job.id,
          printFileId,
          issueLabel,
          plateCount: plates.length,
        },
      });

      await this.prisma.generatedPrintFile.update({
        where: { id: printFileId },
        data: { status: "FAILED", errorMessage: message },
      });

      throw error;
    }
  }
}
