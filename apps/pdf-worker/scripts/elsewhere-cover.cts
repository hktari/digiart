/**
 * ELSEWHERE covers — typographic only, no image.
 *
 * The object sits on a café table in front of someone with ten idle minutes.
 * It has to earn being picked up without a picture doing the work, so the cover
 * is a hook and a promise of browsability, not a poster.
 *
 * Three directions, meant to be printed and compared rather than argued about.
 */
import { type PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import type { PageDimensions } from "../src/booklet/booklet.types";

const MM_TO_PT = 2.8346;
const mm = (v: number) => v * MM_TO_PT;

/** Warm off-white — reads as paper, not as a screen. */
const PAPER = rgb(0.965, 0.957, 0.941);
const INK = rgb(0.08, 0.08, 0.09);
const SOFT = rgb(0.45, 0.45, 0.47);

export type CoverVariant = "masthead" | "question" | "index";

export interface CoverContent {
  issue: string;
  hook: string;
  /** Section or world names, used as the cover texture in the index variant. */
  worlds: string[];
  footer: string;
}

export interface CoverFonts {
  regular: PDFFont;
  bold: PDFFont;
  serif: PDFFont;
}

/**
 * pdf-lib has no letter-spacing, and a masthead without tracking looks like a
 * paragraph. Draw it a glyph at a time.
 */
function trackedText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  tracking: number,
  centreX: number,
  y: number,
  color = INK,
) {
  const chars = [...text];
  const total =
    chars.reduce((w, c) => w + font.widthOfTextAtSize(c, size), 0) +
    tracking * (chars.length - 1);
  let x = centreX - total / 2;
  for (const c of chars) {
    page.drawText(c, { x, y, size, font, color });
    x += font.widthOfTextAtSize(c, size) + tracking;
  }
  return total;
}

function centred(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  centreX: number,
  y: number,
  color = INK,
) {
  page.drawText(text, {
    x: centreX - font.widthOfTextAtSize(text, size) / 2,
    y,
    size,
    font,
    color,
  });
}

/** Wrap on width, returning the lines. */
function wrap(font: PDFFont, text: string, size: number, maxW: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawElsewhereCover(
  pdfDoc: PDFDocument,
  fonts: CoverFonts,
  page: PageDimensions,
  variant: CoverVariant,
  content: CoverContent,
): PDFPage {
  const { widthPt: W, heightPt: H } = page;
  const p = pdfDoc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });
  const cx = W / 2;

  if (variant === "masthead") {
    // Brand first, hook second. The most conventional of the three, and the
    // one that reads as a magazine at a glance.
    trackedText(p, fonts.bold, "ELSEWHERE", 30, 8, cx, H * 0.7);
    p.drawLine({
      start: { x: mm(30), y: H * 0.66 },
      end: { x: W - mm(30), y: H * 0.66 },
      thickness: 0.6,
      color: INK,
    });
    const lines = wrap(fonts.serif, content.hook, 13, W - mm(70));
    lines.forEach((line, i) =>
      centred(p, fonts.serif, line, 13, cx, H * 0.6 - i * mm(7), SOFT),
    );
    centred(p, fonts.regular, content.issue, 8, cx, mm(18), SOFT);
  }

  if (variant === "question") {
    // Hook first, brand last. For someone who has not heard of us and is only
    // deciding whether to pick the thing up.
    const lines = wrap(fonts.serif, content.hook, 21, W - mm(60));
    lines.forEach((line, i) =>
      centred(p, fonts.serif, line, 21, cx, H * 0.58 - i * mm(11)),
    );
    trackedText(p, fonts.regular, "ELSEWHERE", 9, 4, cx, mm(24), SOFT);
    centred(p, fonts.regular, content.issue, 7, cx, mm(17), SOFT);
  }

  if (variant === "index") {
    // The contents ARE the cover. A list is inherently browsable, which is the
    // exact behaviour we want from someone with ten idle minutes.
    trackedText(p, fonts.bold, "ELSEWHERE", 13, 5, cx, H - mm(26));
    p.drawLine({
      start: { x: mm(22), y: H - mm(32) },
      end: { x: W - mm(22), y: H - mm(32) },
      thickness: 0.6,
      color: INK,
    });

    let y = H - mm(48);
    for (const world of content.worlds.slice(0, 9)) {
      p.drawText(world, { x: mm(22), y, size: 12, font: fonts.serif, color: INK });
      y -= mm(13);
    }

    const lines = wrap(fonts.regular, content.hook, 9, W - mm(44));
    lines.forEach((line, i) =>
      p.drawText(line, {
        x: mm(22),
        y: mm(26) - i * mm(5),
        size: 9,
        font: fonts.regular,
        color: SOFT,
      }),
    );
    p.drawText(content.issue, {
      x: mm(22),
      y: mm(15),
      size: 7,
      font: fonts.regular,
      color: SOFT,
    });
  }

  return p;
}

/**
 * Back cover: the masthead promise, small. This is the only place the consent
 * story gets told in the object itself, and it is the whole differentiator.
 */
export function drawElsewhereBackCover(
  pdfDoc: PDFDocument,
  fonts: CoverFonts,
  page: PageDimensions,
  content: CoverContent,
): PDFPage {
  const { widthPt: W, heightPt: H } = page;
  const p = pdfDoc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

  const lines = wrap(fonts.serif, content.footer, 11, W - mm(60));
  lines.forEach((line, i) =>
    centred(p, fonts.serif, line, 11, W / 2, H * 0.55 - i * mm(6.5), INK),
  );
  trackedText(p, fonts.regular, "ELSEWHERE", 8, 4, W / 2, mm(20), SOFT);
  return p;
}
