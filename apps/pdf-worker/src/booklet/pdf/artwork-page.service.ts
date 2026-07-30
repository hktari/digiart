import { Injectable } from "@nestjs/common";
import {
  degrees,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
} from "pdf-lib";
import type { PageDimensions } from "../booklet.types";

const MARGIN_PT = 28.35; // 10mm. According to Peecho Guidelines

/**
 * Strip at the foot of the print area reserved for the plate caption. It is
 * taken out of the image's height, never out of the 10mm safe margin, so the
 * credit still lands inside Peecho's printable area.
 */
const CAPTION_BAND_PT = 16;
const CAPTION_FONT_SIZE = 7;
const CAPTION_BASELINE_OFFSET_PT = 4; // above the safe margin, leaving room for descenders
const CAPTION_COLOR = rgb(0.35, 0.35, 0.35);
const CAPTION_ELLIPSIS = "...";

/**
 * Code points above U+00FF that WinAnsi can still represent. Everything else
 * above Latin-1 has no encoding in pdf-lib's standard fonts.
 */
const WINANSI_ABOVE_LATIN1 = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/**
 * Standard PDF fonts are WinAnsi-encoded, so `drawText` throws on anything it
 * cannot map — CJK, emoji, and a good deal of what turns up in social handles.
 * A caption is not worth failing a booklet over, so unencodable characters are
 * dropped rather than allowed to kill the job.
 */
export function toWinAnsi(value: string): string {
  return [...value.normalize("NFC")]
    .filter((char) => {
      const cp = char.codePointAt(0) ?? 0;
      if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) return false; // controls
      return cp <= 0xff || WINANSI_ABOVE_LATIN1.has(cp);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trim a caption to the image's own width so it never runs into the margin. */
function fitToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;

  let trimmed = text;
  while (
    trimmed.length > 0 &&
    font.widthOfTextAtSize(trimmed + CAPTION_ELLIPSIS, size) > maxWidth
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.trimEnd() + CAPTION_ELLIPSIS;
}

export interface ArtworkCaption {
  /** Rendered as-is after WinAnsi sanitising, e.g. `Title — Creator`. */
  text: string;
  font: PDFFont;
}

@Injectable()
export class ArtworkPageService {
  async addPageAsync(
    pdfDoc: PDFDocument,
    imageBytes: Uint8Array,
    mimeType: string,
    orientation: string,
    pageDimensions: PageDimensions,
    caption?: ArtworkCaption,
  ): Promise<PDFPage> {
    const { widthPt: PAGE_WIDTH_PT, heightPt: PAGE_HEIGHT_PT } = pageDimensions;
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    // Resolved before the layout maths: a caption that sanitises down to
    // nothing must not steal height from the image.
    const captionText = caption ? toWinAnsi(caption.text) : "";
    const captionBandPt = captionText ? CAPTION_BAND_PT : 0;

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

    const isImageLandscape = orientation === "LANDSCAPE";
    const isPageLandscape = PAGE_WIDTH_PT > PAGE_HEIGHT_PT;
    const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
    const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2 - captionBandPt;
    const printBottom = MARGIN_PT + captionBandPt;

    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;
    let rotate = degrees(0);

    // Rotation needed when image orientation doesn't match page orientation
    const needsRotation = isImageLandscape !== isPageLandscape;

    if (needsRotation) {
      // pdf-lib rotates 90° CCW around bottom-left anchor (x, y).
      // After 90° rotation: visible width = original height, visible height = original width.
      // We scale based on the POST-rotation dimensions (swapped).
      const scale = Math.min(printW / image.height, printH / image.width);
      drawW = image.width * scale;
      drawH = image.height * scale;
      // Position: center the rotated image, accounting for rotation anchor at bottom-left
      drawX = MARGIN_PT + (printW - drawH) / 2 + drawH;
      drawY = printBottom + (printH - drawW) / 2;
      rotate = degrees(90);
    } else {
      const scale = Math.min(printW / image.width, printH / image.height);
      drawW = image.width * scale;
      drawH = image.height * scale;
      drawX = MARGIN_PT + (printW - drawW) / 2;
      drawY = printBottom + (printH - drawH) / 2;
    }

    page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
      rotate,
    });

    if (caption && captionText) {
      // A 90° rotation is counter-clockwise about (drawX, drawY), so the
      // rotated image occupies [drawX - drawH, drawX] horizontally. Aligning
      // the caption to the image's own left edge — rather than the page's —
      // keeps it reading as a plate caption at any aspect ratio.
      const imageLeft = needsRotation ? drawX - drawH : drawX;
      const imageWidth = needsRotation ? drawH : drawW;

      page.drawText(
        fitToWidth(captionText, caption.font, CAPTION_FONT_SIZE, imageWidth),
        {
          x: imageLeft,
          y: MARGIN_PT + CAPTION_BASELINE_OFFSET_PT,
          size: CAPTION_FONT_SIZE,
          font: caption.font,
          color: CAPTION_COLOR,
        },
      );
    }

    return page;
  }
}
