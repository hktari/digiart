import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { type PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import type { PageDimensions } from "../booklet.types";

const BEIGE_50 = rgb(0.98, 0.973, 0.957);
const FUCHSIA_600 = rgb(0.753, 0.149, 0.827);
const FUCHSIA_700 = rgb(0.635, 0.11, 0.686);
const WHITE = rgb(1, 1, 1);

@Injectable()
export class CoverPageService {
  private readonly logger = new Logger(CoverPageService.name);

  async addFrontCover(
    pdfDoc: PDFDocument,
    font: PDFFont,
    issueLabel: string,
    creatorNames: string[],
    pageDimensions: PageDimensions,
  ): Promise<PDFPage> {
    const { widthPt: PAGE_WIDTH_PT, heightPt: PAGE_HEIGHT_PT } = pageDimensions;
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH_PT,
      height: PAGE_HEIGHT_PT,
      color: BEIGE_50,
    });

    try {
      const logoPath = join(
        process.cwd(),
        "../../apps/landing/public/logo.png",
      );
      const logoBytes = await readFile(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);

      const logoMaxW = PAGE_WIDTH_PT * 0.4;
      const scale = logoMaxW / logoImage.width;
      const logoW = logoImage.width * scale;
      const logoH = logoImage.height * scale;
      const logoX = (PAGE_WIDTH_PT - logoW) / 2;
      const logoY = PAGE_HEIGHT_PT * 0.62;

      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoW,
        height: logoH,
      });
    } catch {
      this.logger.warn("Logo not found, skipping logo on front cover");
    }

    const issueFontSize = 14;
    const issueTextW = font.widthOfTextAtSize(issueLabel, issueFontSize);
    page.drawText(issueLabel, {
      x: (PAGE_WIDTH_PT - issueTextW) / 2,
      y: PAGE_HEIGHT_PT * 0.55,
      size: issueFontSize,
      font,
      color: FUCHSIA_700,
    });

    const byline =
      creatorNames.length === 0
        ? "Selected Works"
        : creatorNames.length === 1
          ? creatorNames[0]
          : "Selected Works";

    const bylineFontSize = 10;
    const bylineW = font.widthOfTextAtSize(byline, bylineFontSize);
    page.drawText(byline, {
      x: (PAGE_WIDTH_PT - bylineW) / 2,
      y: PAGE_HEIGHT_PT * 0.5,
      size: bylineFontSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    return page;
  }

  async addBackCover(
    pdfDoc: PDFDocument,
    pageDimensions: PageDimensions,
  ): Promise<PDFPage> {
    const { widthPt: PAGE_WIDTH_PT, heightPt: PAGE_HEIGHT_PT } = pageDimensions;
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH_PT,
      height: PAGE_HEIGHT_PT,
      color: FUCHSIA_600,
    });

    try {
      const logoPath = join(
        process.cwd(),
        "../../apps/landing/public/logo.png",
      );
      const logoBytes = await readFile(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);

      const logoMaxW = PAGE_WIDTH_PT * 0.28;
      const scale = logoMaxW / logoImage.width;
      const logoW = logoImage.width * scale;
      const logoH = logoImage.height * scale;

      page.drawImage(logoImage, {
        x: (PAGE_WIDTH_PT - logoW) / 2,
        y: (PAGE_HEIGHT_PT - logoH) / 2,
        width: logoW,
        height: logoH,
        opacity: 0.9,
      });
    } catch {
      this.logger.warn("Logo not found, skipping logo on back cover");
    }

    void WHITE;

    return page;
  }
}
