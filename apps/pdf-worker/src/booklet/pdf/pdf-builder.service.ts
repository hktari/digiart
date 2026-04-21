import { Injectable, Logger } from "@nestjs/common";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ArtworkRecord } from "../booklet.types";
import { ArtworkPageService } from "./artwork-page.service";
import { CoverPageService } from "./cover-page.service";

const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;

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
  ): Promise<{ bytes: Uint8Array; pageCount: number }> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    await this.coverPageService.addFrontCover(
      pdfDoc,
      font,
      issueLabel,
      creatorNames,
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
      );
    }

    await this.coverPageService.addBackCover(pdfDoc);

    const pageCount = pdfDoc.getPageCount();
    if (pageCount % 2 !== 0) {
      const blank = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
      blank.drawRectangle({
        x: 0,
        y: 0,
        width: PAGE_WIDTH_PT,
        height: PAGE_HEIGHT_PT,
        color: rgb(1, 1, 1),
      });
    }

    const finalPageCount = pdfDoc.getPageCount();
    const bytes = await pdfDoc.save();
    return { bytes, pageCount: finalPageCount };
  }
}
