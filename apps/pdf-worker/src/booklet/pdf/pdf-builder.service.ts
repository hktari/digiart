import { Injectable, Logger } from "@nestjs/common";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  DEFAULT_PAGE_FORMAT,
  PAGE_DIMENSIONS,
  type ArtworkRecord,
  type PageFormat,
} from "../booklet.types";
import { ArtworkPageService } from "./artwork-page.service";
import { CoverPageService } from "./cover-page.service";

@Injectable()
export class PdfBuilderService {
  private readonly logger = new Logger(PdfBuilderService.name);

  constructor(
    private readonly artworkPageService: ArtworkPageService,
    private readonly coverPageService: CoverPageService,
  ) {}

  async build(
    artworks: ArtworkRecord[],
    imageBuffers: Map<string, Buffer>,
    issueLabel: string,
    creatorNames: string[],
    pageFormat: PageFormat = DEFAULT_PAGE_FORMAT,
  ): Promise<{ bytes: Uint8Array; pageCount: number }> {
    const pageDimensions = PAGE_DIMENSIONS[pageFormat];
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

    await this.coverPageService.addBackCover(pdfDoc, pageDimensions);

    const pageCount = pdfDoc.getPageCount();
    if (pageCount % 2 !== 0) {
      const blank = pdfDoc.addPage([widthPt, heightPt]);
      blank.drawRectangle({
        x: 0,
        y: 0,
        width: widthPt,
        height: heightPt,
        color: rgb(1, 1, 1),
      });
    }

    const finalPageCount = pdfDoc.getPageCount();
    const bytes = await pdfDoc.save();
    return { bytes, pageCount: finalPageCount };
  }
}
