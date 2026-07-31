/**
 * Calibration pages for a physical print test.
 *
 * These exist so a printed proof answers questions with a ruler and a
 * comparison rather than an impression. Everything here is drawn at absolute
 * page coordinates — deliberately NOT through ArtworkPageService, whose job is
 * to scale artwork into the safe margin. A ruler that got scaled would measure
 * nothing.
 */
import { type PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import type { PageDimensions } from "../src/booklet/booklet.types";

const MM_TO_PT = 2.8346;
const mm = (v: number) => v * MM_TO_PT;

const INK = rgb(0.1, 0.1, 0.1);
const FAINT = rgb(0.6, 0.6, 0.6);

function label(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size = 7,
) {
  page.drawText(text, { x, y, size, font, color: INK });
}

/**
 * Page 1 of the test: is the PDF printed 1:1, and where does the trim fall?
 *
 * A 100mm rule that measures 100mm on paper proves there is no scaling. Corner
 * marks sitting exactly on the page edge show how much the guillotine takes.
 */
export function drawRulerPage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  page: PageDimensions,
): void {
  const { widthPt: W, heightPt: H } = page;
  const p = pdfDoc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });

  label(p, font, "PRINT TEST 1 — SCALE & TRIM", mm(10), H - mm(14), 10);
  label(
    p,
    font,
    "The bar below must measure exactly 100 mm on paper. If it does not, the file is being scaled.",
    mm(10),
    H - mm(20),
  );

  // 100mm horizontal rule with 10mm ticks.
  const rulerY = H - mm(40);
  const rulerX = mm(10);
  p.drawLine({
    start: { x: rulerX, y: rulerY },
    end: { x: rulerX + mm(100), y: rulerY },
    thickness: 1,
    color: INK,
  });
  for (let i = 0; i <= 10; i++) {
    const x = rulerX + mm(i * 10);
    const tall = i % 5 === 0;
    p.drawLine({
      start: { x, y: rulerY },
      end: { x, y: rulerY + mm(tall ? 5 : 3) },
      thickness: tall ? 1 : 0.5,
      color: INK,
    });
    if (tall) label(p, font, `${i * 10}`, x - mm(2), rulerY + mm(6), 6);
  }
  label(p, font, "100 mm wide", rulerX, rulerY - mm(5));

  // 100mm vertical rule, to catch non-uniform scaling.
  const vx = mm(10);
  const vy = rulerY - mm(115);
  p.drawLine({
    start: { x: vx, y: vy },
    end: { x: vx, y: vy + mm(100) },
    thickness: 1,
    color: INK,
  });
  for (let i = 0; i <= 10; i++) {
    const y = vy + mm(i * 10);
    const tall = i % 5 === 0;
    p.drawLine({
      start: { x: vx, y },
      end: { x: vx + mm(tall ? 5 : 3), y },
      thickness: tall ? 1 : 0.5,
      color: INK,
    });
  }
  label(p, font, "100 mm tall", vx + mm(7), vy + mm(50));

  // The 10mm safe margin the renderer uses, so we can see what survives trim.
  p.drawRectangle({
    x: mm(10),
    y: mm(10),
    width: W - mm(20),
    height: H - mm(20),
    borderColor: FAINT,
    borderWidth: 0.5,
  });
  label(p, font, "10 mm safe margin", mm(12), mm(12), 6);

  // Corner marks flush to the page edge: whatever is missing was trimmed.
  const arm = mm(8);
  const corners: [number, number, number, number][] = [
    [0, 0, arm, 0],
    [0, 0, 0, arm],
    [W, 0, W - arm, 0],
    [W, 0, W, arm],
    [0, H, arm, H],
    [0, H, 0, H - arm],
    [W, H, W - arm, H],
    [W, H, W, H - arm],
  ];
  for (const [x1, y1, x2, y2] of corners) {
    p.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1,
      color: INK,
    });
  }
  label(
    p,
    font,
    "Corner marks touch the page edge. Measure what is left of each arm to see how much trim was taken.",
    mm(10),
    mm(20),
  );
}

/** A single colour swatch with its own label underneath. */
function swatch(
  p: PDFPage,
  font: PDFFont,
  x: number,
  y: number,
  w: number,
  h: number,
  color: ReturnType<typeof rgb>,
  name: string,
) {
  p.drawRectangle({ x, y, width: w, height: h, color });
  label(p, font, name, x, y - mm(3.5), 5);
}

/**
 * Page 2: colour. The point is not that these reproduce perfectly — it is that
 * the SAME page can be compared between an RGB build and a CMYK build, and
 * against the screen.
 */
export function drawColourPage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  page: PageDimensions,
  buildLabel: string,
): void {
  const { widthPt: W, heightPt: H } = page;
  const p = pdfDoc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });

  label(p, font, "PRINT TEST 2 — COLOUR", mm(10), H - mm(14), 10);
  label(p, font, `build: ${buildLabel}`, mm(10), H - mm(19), 8);
  label(
    p,
    font,
    "Compare this page across builds and against the screen. Saturated RGB is where conversion hurts most.",
    mm(10),
    H - mm(24),
  );

  const cols = 4;
  const sw = mm(28);
  // Three two-row blocks plus the ramp have to fit above the 10mm margin:
  // 3 * (2 * (sh + gapY) + 6) must leave room below H - 38mm.
  const sh = mm(13);
  const gapX = mm(4);
  const gapY = mm(7);
  const startX = mm(10);
  let startY = H - mm(38);

  const rows: [string, [string, ReturnType<typeof rgb>][]][] = [
    [
      "RGB primaries & secondaries",
      [
        ["R 255", rgb(1, 0, 0)],
        ["G 255", rgb(0, 1, 0)],
        ["B 255", rgb(0, 0, 1)],
        ["Cyan", rgb(0, 1, 1)],
        ["Magenta", rgb(1, 0, 1)],
        ["Yellow", rgb(1, 1, 0)],
        ["Orange", rgb(1, 0.5, 0)],
        ["Violet", rgb(0.5, 0, 1)],
      ],
    ],
    [
      "Saturated, the kind digital art uses",
      [
        ["Hot pink", rgb(1, 0.08, 0.58)],
        ["Electric blue", rgb(0.0, 0.6, 1)],
        ["Acid green", rgb(0.4, 1, 0.0)],
        ["Deep teal", rgb(0, 0.45, 0.45)],
        ["Crimson", rgb(0.86, 0.08, 0.24)],
        ["Gold", rgb(1, 0.84, 0)],
        ["Indigo", rgb(0.29, 0, 0.51)],
        ["Coral", rgb(1, 0.5, 0.31)],
      ],
    ],
    [
      "Skin tones & neutrals",
      [
        ["Skin 1", rgb(1, 0.87, 0.77)],
        ["Skin 2", rgb(0.9, 0.72, 0.58)],
        ["Skin 3", rgb(0.72, 0.53, 0.4)],
        ["Skin 4", rgb(0.45, 0.31, 0.22)],
        ["Warm grey", rgb(0.6, 0.58, 0.55)],
        ["Cool grey", rgb(0.55, 0.58, 0.62)],
        ["Near white", rgb(0.97, 0.97, 0.97)],
        ["Near black", rgb(0.06, 0.06, 0.06)],
      ],
    ],
  ];

  for (const [title, entries] of rows) {
    label(p, font, title, startX, startY + mm(3), 7);
    entries.forEach(([name, color], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      swatch(
        p,
        font,
        startX + col * (sw + gapX),
        startY - sh - row * (sh + gapY),
        sw,
        sh,
        color,
        name,
      );
    });
    startY -= 2 * (sh + gapY) + mm(6);
  }

  // Greyscale ramp — where banding and black point show up.
  label(p, font, "Greyscale ramp (0-100 percent)", startX, startY + mm(3), 7);
  const steps = 11;
  const rw = (W - mm(20)) / steps;
  for (let i = 0; i < steps; i++) {
    const v = 1 - i / (steps - 1);
    p.drawRectangle({
      x: startX + i * rw,
      y: startY - mm(14),
      width: rw,
      height: mm(14),
      color: rgb(v, v, v),
    });
  }
  label(
    p,
    font,
    "Look for: banding, where black stops separating, and whether near-white holds.",
    startX,
    startY - mm(19),
    6,
  );
}

/**
 * Page 3: does the credit line work at print size, and is a handle enough?
 *
 * The captions in the real book are 7pt. Seeing that on paper is the only way
 * to answer whether "@handle" reads as a credit or as a watermark.
 */
export function drawCreditsPage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  page: PageDimensions,
): void {
  const { widthPt: W, heightPt: H } = page;
  const p = pdfDoc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });

  label(p, font, "PRINT TEST 3 — CREDITS", mm(10), H - mm(14), 10);
  label(
    p,
    font,
    "The book currently prints the 7pt line. Is a handle alone a sufficient credit?",
    mm(10),
    H - mm(20),
  );

  const variants = [
    "@magdalenakaczmarczykart",
    "Magdalena Kaczmarczyk (@magdalenakaczmarczykart)",
    "Untitled — @magdalenakaczmarczykart",
    "Untitled, 2026 — Magdalena Kaczmarczyk",
    "Magdalena Kaczmarczyk - threads.com/@magdalenakaczmarczykart",
  ];

  let y = H - mm(34);
  for (const size of [6, 7, 8, 9]) {
    label(p, font, `${size} pt${size === 7 ? "  (current)" : ""}`, mm(10), y, 7);
    y -= mm(6);
    for (const v of variants) {
      p.drawText(v, {
        x: mm(14),
        y,
        size,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
      y -= mm(5.5);
    }
    y -= mm(4);
  }

  label(
    p,
    font,
    "Also check the real plates: the caption sits along the image's bottom edge, rotated on landscape plates.",
    mm(10),
    mm(14),
    6,
  );
}

/**
 * Page 4: the resolution ladder — the page that decides the floor.
 *
 * One image, four cells of identical printed size, each fed from a different
 * pixel count so it lands at 300 / 250 / 200 / 150 dpi. Whichever cell is the
 * first that looks wrong on paper is where PRINT_DPI_FLOOR belongs. The tier
 * spread in a normal proof cannot answer this, because every plate is a
 * different picture.
 */
export function drawResolutionLadder(
  pdfDoc: PDFDocument,
  font: PDFFont,
  page: PageDimensions,
  cells: { dpi: number; jpeg: Buffer }[],
  cellW: number,
  cellH: number,
): Promise<void> {
  return (async () => {
    const { widthPt: W, heightPt: H } = page;
    const p = pdfDoc.addPage([W, H]);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });

    label(p, font, "PRINT TEST 4 — RESOLUTION", mm(10), H - mm(14), 10);
    label(
      p,
      font,
      "Same image, same printed size, different pixel counts. The first cell that looks wrong is the floor.",
      mm(10),
      H - mm(20),
    );

    const gap = mm(5);
    const startX = mm(10);
    const startY = H - mm(30) - cellH;

    for (const [i, cell] of cells.entries()) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cellW + gap);
      const y = startY - row * (cellH + gap + mm(7));

      const img = await pdfDoc.embedJpg(cell.jpeg);
      p.drawImage(img, { x, y, width: cellW, height: cellH });
      p.drawRectangle({
        x,
        y,
        width: cellW,
        height: cellH,
        borderColor: FAINT,
        borderWidth: 0.4,
      });
      label(p, font, `${cell.dpi} dpi`, x, y - mm(4), 8);
    }

    label(
      p,
      font,
      "250 dpi is the current floor; 200-250 prints but is flagged to the collector.",
      mm(10),
      mm(6),
      6,
    );
  })();
}
