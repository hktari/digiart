import { Injectable } from "@nestjs/common";
import { layoutPlate, MARGIN_PT } from "@printfeed/print-geometry";
import {
  degrees,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
} from "pdf-lib";
import type { PageDimensions } from "../booklet.types";

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

    // Placement comes from the shared geometry package, which is also what the
    // resolution gate scores against. The two used to be separate expressions
    // of the same measurement and had drifted: the gate demanded enough pixels
    // for a full-bleed page while this method has always drawn inside the
    // margin. One function now, so they cannot disagree again.
    const { needsRotation, drawW, drawH, drawX, drawY } = layoutPlate({
      imageWidthPx: image.width,
      imageHeightPx: image.height,
      orientation,
      page: pageDimensions,
      hasCaption: Boolean(captionText),
    });
    const rotate = needsRotation ? degrees(90) : degrees(0);

    page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
      rotate,
    });

    if (caption && captionText) {
      const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
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
