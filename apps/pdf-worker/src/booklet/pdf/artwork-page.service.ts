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
 * Strip of the print area reserved for the plate caption, along whichever edge
 * is the image's own bottom. It is taken out of the space available to the
 * image, never out of the 10mm safe margin, so the credit still lands inside
 * Peecho's printable area.
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
 *
 * Normalising with NFKC rather than NFC first: styled Unicode is everywhere on
 * social platforms, and NFKC folds "𝕽𝖎𝖛𝖊𝖗𝖘" and friends back to plain letters.
 * Under NFC those code points survive normalisation only to be dropped here,
 * silently erasing a legible title.
 */
export function toWinAnsi(value: string): string {
  return [...value.normalize("NFKC")]
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
    // Rotation needed when image orientation doesn't match page orientation
    const needsRotation = isImageLandscape !== isPageLandscape;

    const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
    const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;

    // The caption always runs along the plate's own bottom edge, so that the
    // reader who turns the book to view a rotated plate finds the credit the
    // right way up beside it. On a rotated plate that edge is vertical, which
    // is why the band comes out of the width instead of the height — reserving
    // it at the page foot would leave a full-width rotated image with nowhere
    // to put the text.
    const bandW = needsRotation ? captionBandPt : 0;
    const bandH = needsRotation ? 0 : captionBandPt;
    const availW = printW - bandW;
    const availH = printH - bandH;

    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;
    let rotate = degrees(0);

    if (needsRotation) {
      // pdf-lib rotates 90° CCW around bottom-left anchor (x, y).
      // After 90° rotation: visible width = original height, visible height = original width.
      // We scale based on the POST-rotation dimensions (swapped).
      const scale = Math.min(availW / image.height, availH / image.width);
      drawW = image.width * scale;
      drawH = image.height * scale;
      // Position: center the rotated image, accounting for rotation anchor at bottom-left
      drawX = MARGIN_PT + (availW - drawH) / 2 + drawH;
      drawY = MARGIN_PT + (availH - drawW) / 2;
      rotate = degrees(90);
    } else {
      const scale = Math.min(availW / image.width, availH / image.height);
      drawW = image.width * scale;
      drawH = image.height * scale;
      drawX = MARGIN_PT + (availW - drawW) / 2;
      drawY = MARGIN_PT + bandH + (availH - drawH) / 2;
    }

    page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
      rotate,
    });

    if (caption && captionText) {
      // Either way the caption starts at the plate's bottom-left corner *in
      // the plate's own frame* and runs the length of its bottom edge, which
      // after rotation is drawW in both cases.
      const text = fitToWidth(
        captionText,
        caption.font,
        CAPTION_FONT_SIZE,
        drawW,
      );
      const shared = {
        size: CAPTION_FONT_SIZE,
        font: caption.font,
        color: CAPTION_COLOR,
      };

      page.drawText(
        text,
        needsRotation
          ? {
              // Baseline inset from the page's right edge, mirroring how the
              // unrotated caption is inset from the foot; glyphs ascend back
              // toward the image.
              x: MARGIN_PT + printW - CAPTION_BASELINE_OFFSET_PT,
              y: drawY,
              rotate: degrees(90),
              ...shared,
            }
          : {
              x: drawX,
              y: MARGIN_PT + CAPTION_BASELINE_OFFSET_PT,
              ...shared,
            },
      );
    }

    return page;
  }
}
