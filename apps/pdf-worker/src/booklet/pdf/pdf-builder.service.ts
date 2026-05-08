import { Injectable, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  type ArtworkRecord,
  DEFAULT_PAGE_FORMAT,
  PAGE_DIMENSIONS,
  type PageDimensions,
  type PageFormat,
} from "../booklet.types";
import { ArtworkPageService } from "./artwork-page.service";
import { CoverPageService } from "./cover-page.service";
import { PdfXProcessorService } from "./pdfx-processor.service";

@Injectable()
export class PdfBuilderService {
  private readonly logger = new Logger(PdfBuilderService.name);
  private readonly MM_TO_PT = 2.8346;

  private mmToPt(mm: number): number {
    return mm * this.MM_TO_PT;
  }

  constructor(
    private readonly artworkPageService: ArtworkPageService,
    private readonly coverPageService: CoverPageService,
    private readonly pdfxProcessor: PdfXProcessorService,
  ) {}

  async build(
    artworks: ArtworkRecord[],
    imageBuffers: Map<string, Buffer>,
    issueLabel: string,
    creatorNames: string[],
    pageFormat: PageFormat = DEFAULT_PAGE_FORMAT,
    widthMm?: number,
    heightMm?: number,
  ): Promise<{ bytes: Uint8Array; pageCount: number }> {
    // Use direct dimensions if provided, otherwise fall back to pageFormat enum
    const pageDimensions: PageDimensions =
      widthMm !== undefined && heightMm !== undefined
        ? {
            widthPt: this.mmToPt(widthMm),
            heightPt: this.mmToPt(heightMm),
          }
        : PAGE_DIMENSIONS[pageFormat];
    const { widthPt, heightPt } = pageDimensions;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    await this.coverPageService.addFrontCover(
      pdfDoc,
      font,
      issueLabel,
      creatorNames,
      pageDimensions,
    );

    for (const artwork of artworks) {
      const buf = imageBuffers.get(artwork.id);
      if (!buf) {
        this.logger.warn(`No image buffer for artwork ${artwork.id}, skipping`);
        continue;
      }

      const mimeType = artwork.mimeType ?? "image/jpeg";
      await this.artworkPageService.addPageAsync(
        pdfDoc,
        buf,
        mimeType,
        artwork.orientation,
        pageDimensions,
      );
    }

    const pageCountBeforeCover = pdfDoc.getPageCount();
    if (pageCountBeforeCover % 2 === 0) {
      const blank = pdfDoc.addPage([widthPt, heightPt]);
      blank.drawRectangle({
        x: 0,
        y: 0,
        width: widthPt,
        height: heightPt,
        color: rgb(1, 1, 1),
      });
    }

    await this.coverPageService.addBackCover(pdfDoc, pageDimensions);

    const finalPageCount = pdfDoc.getPageCount();
    const rawBytes = await pdfDoc.save();

    // Post-process with GhostScript to achieve PDF/X-4 compliance
    this.logger.log(
      `Post-processing PDF to PDF/X-4 format (${rawBytes.length} bytes)...`,
    );
    let pdfxBytes: Uint8Array;
    try {
      pdfxBytes = await this.pdfxProcessor.postProcessToPDFX(rawBytes);
      this.logger.log(`PDF/X conversion successful: ${pdfxBytes.length} bytes`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `PDF/X conversion failed, returning raw PDF: ${message}`,
      );
      Sentry.captureException(error, {
        tags: {
          component: "pdf-builder",
          errorType: "pdfx-conversion-fallback",
        },
        extra: { issueLabel, rawPdfBytes: rawBytes.length },
      });
      // Fallback to raw PDF if conversion fails
      pdfxBytes = rawBytes;
    }

    return { bytes: pdfxBytes, pageCount: finalPageCount };
  }
}
