import { Injectable } from "@nestjs/common";
import { type PDFDocument, type PDFPage, degrees, rgb } from "pdf-lib";

const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;
const MARGIN_PT = 28.35;

@Injectable()
export class ArtworkPageService {
  addPage(
    pdfDoc: PDFDocument,
    imageBytes: Uint8Array,
    mimeType: string,
    orientation: string,
  ): PDFPage {
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH_PT,
      height: PAGE_HEIGHT_PT,
      color: rgb(1, 1, 1),
    });

    const embed =
      mimeType === "image/png"
        ? pdfDoc.embedPng(imageBytes)
        : pdfDoc.embedJpg(imageBytes);

    void Promise.resolve(embed).then((image) => {
      const isLandscape = orientation === "LANDSCAPE";

      const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
      const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;

      let drawW: number;
      let drawH: number;
      let drawX: number;
      let drawY: number;
      let rotate = degrees(0);

      if (isLandscape) {
        const scale = Math.min(printH / image.width, printW / image.height);
        drawW = image.height * scale;
        drawH = image.width * scale;
        drawX = MARGIN_PT + (printW - drawW) / 2;
        drawY = MARGIN_PT + (printH - drawH) / 2;
        rotate = degrees(90);
        drawX += drawW;
      } else {
        const scale = Math.min(printW / image.width, printH / image.height);
        drawW = image.width * scale;
        drawH = image.height * scale;
        drawX = MARGIN_PT + (printW - drawW) / 2;
        drawY = MARGIN_PT + (printH - drawH) / 2;
      }

      page.drawImage(image, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
        rotate,
      });
    });

    return page;
  }

  async addPageAsync(
    pdfDoc: PDFDocument,
    imageBytes: Uint8Array,
    mimeType: string,
    orientation: string,
  ): Promise<PDFPage> {
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH_PT,
      height: PAGE_HEIGHT_PT,
      color: rgb(1, 1, 1),
    });

    const image =
      mimeType === "image/png"
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

    const isLandscape = orientation === "LANDSCAPE";
    const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
    const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;

    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;
    let rotate = degrees(0);

    if (isLandscape) {
      const scale = Math.min(printH / image.width, printW / image.height);
      drawW = image.height * scale;
      drawH = image.width * scale;
      drawX = MARGIN_PT + (printW - drawW) / 2 + drawW;
      drawY = MARGIN_PT + (printH - drawH) / 2;
      rotate = degrees(90);
    } else {
      const scale = Math.min(printW / image.width, printH / image.height);
      drawW = image.width * scale;
      drawH = image.height * scale;
      drawX = MARGIN_PT + (printW - drawW) / 2;
      drawY = MARGIN_PT + (printH - drawH) / 2;
    }

    page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
      rotate,
    });

    return page;
  }
}
