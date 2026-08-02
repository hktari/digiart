#!/usr/bin/env tsx
/**
 * Build the ELSEWHERE demo edition.
 *
 * Deliberately almost wordless. We have no copy from the artists, and writing
 * titles or field notes on their behalf would be putting words in their mouth —
 * the same authorship overstep as upscaling their work. So the demo says only
 * what is true: a hook, the art, a handle, and the masthead promise.
 *
 * Full-page plates inside the 10mm safe margin, credited with the handle only.
 * Square by default: 210x210 matches Peecho's softcover photobook square, and
 * a square page never rotates a landscape plate.
 *
 * Usage:
 *   npx tsx scripts/build-elsewhere-demo.cts --source ~/Downloads/elsewhere-01 \
 *     --out ~/Downloads/elsewhere-demo.pdf
 *
 *   --source <dir>     curated collects folder (extension layout)
 *   --out <file>       output PDF
 *   --issue <label>    default "Issue 01"
 *   --hook <text>      cover line
 *   --cover <variant>  question | masthead | index   (default question)
 *   --per-artist <n>   max plates per artist, 0 = unlimited (default 0)
 *   --plates <n>       hard cap on total plates, 0 = unlimited (default 0)
 *   --format <fmt>     default SQUARE_210
 *   --colour rgb|cmyk  default rgb, which is what Peecho asks for
 *   --no-promise       omit the back-cover masthead line
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join, resolve } from "node:path";
import {
  gradePlate,
  orientationFromPixels,
  PAGE_DIMENSIONS,
  plateDpi,
} from "@printfeed/print-geometry";
import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import type { PageFormat } from "../src/booklet/booklet.types";
import { ArtworkPageService } from "../src/booklet/pdf/artwork-page.service";
import { PdfXProcessorService } from "../src/booklet/pdf/pdfx-processor.service";
import {
  type CoverVariant,
  drawElsewhereBackCover,
  drawElsewhereCover,
} from "./elsewhere-cover.cts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const PROMISE =
  "Every world in these pages was made by a named artist who chose to be here.";

interface Plate {
  handle: string;
  file: string;
  path: string;
  width: number;
  height: number;
  format: string;
  dpi: number;
}

function parseArgs(argv: string[]) {
  const opts = {
    source: join(homedir(), "Downloads", "art-collect"),
    out: resolve("elsewhere-demo.pdf"),
    issue: "Issue 01",
    hook: "You have ten minutes. Go somewhere.",
    cover: "question" as CoverVariant,
    perArtist: 0,
    plates: 0,
    format: "SQUARE_210" as PageFormat,
    colour: "rgb" as "rgb" | "cmyk",
    promise: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} needs a value`);
      return v;
    };
    if (arg === "--source") opts.source = resolve(next());
    else if (arg === "--out") opts.out = resolve(next());
    else if (arg === "--issue") opts.issue = next();
    else if (arg === "--hook") opts.hook = next();
    else if (arg === "--cover") opts.cover = next() as CoverVariant;
    else if (arg === "--per-artist") opts.perArtist = Number.parseInt(next(), 10);
    else if (arg === "--plates") opts.plates = Number.parseInt(next(), 10);
    else if (arg === "--colour" || arg === "--color") {
      const v = next();
      if (v !== "rgb" && v !== "cmyk") throw new Error("--colour must be rgb or cmyk");
      opts.colour = v;
    } else if (arg === "--format") {
      const v = next() as PageFormat;
      if (!(v in PAGE_DIMENSIONS)) {
        throw new Error(`Unknown format "${v}"`);
      }
      opts.format = v;
    } else if (arg === "--no-promise") opts.promise = false;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return opts;
}

async function scan(source: string, page: (typeof PAGE_DIMENSIONS)[PageFormat]) {
  const plates: Plate[] = [];
  const rejected: string[] = [];

  for (const dir of (await readdir(source, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    const dirPath = join(source, dir);
    let handle = dir.split("__")[0];
    try {
      const meta = JSON.parse(
        await readFile(join(dirPath, "metadata.json"), "utf8"),
      );
      if (meta.handle) handle = meta.handle;
    } catch {
      // The directory name carries the handle, which is the whole credit here.
    }

    for (const file of (await readdir(dirPath)).sort()) {
      if (!IMAGE_EXTENSIONS.has(extname(file).toLowerCase())) continue;
      const path = join(dirPath, file);
      const { width, height, format } = await sharp(path).metadata();
      if (!width || !height) continue;

      const plate = {
        imageWidthPx: width,
        imageHeightPx: height,
        orientation: orientationFromPixels(width, height),
        page,
        hasCaption: true,
      };
      const dpi = Math.round(plateDpi(plate));
      if (gradePlate(plate) === "REJECT") {
        rejected.push(`@${handle}/${file} ${width}x${height} ${dpi}dpi`);
        continue;
      }
      plates.push({ handle, file, path, width, height, format: format ?? "", dpi });
    }
  }
  return { plates, rejected };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const PAGE = PAGE_DIMENSIONS[opts.format];
  console.log(`Scanning ${opts.source}… (${opts.format})`);

  const { plates, rejected } = await scan(opts.source, PAGE);

  // Keep an artist's run contiguous — the demo is read as a sequence.
  const byHandle = new Map<string, Plate[]>();
  for (const p of plates) {
    const b = byHandle.get(p.handle) ?? [];
    b.push(p);
    byHandle.set(p.handle, b);
  }
  let selected = [...byHandle.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, items]) =>
      opts.perArtist > 0
        ? [...items].sort((a, b) => b.dpi - a.dpi).slice(0, opts.perArtist)
        : items,
    );
  if (opts.plates > 0) selected = selected.slice(0, opts.plates);

  const artists = [...new Set(selected.map((p) => p.handle))];
  console.log(`  ${selected.length} plates from ${artists.length} artists`);
  if (rejected.length) {
    console.log(`  ${rejected.length} below the print floor:`);
    for (const r of rejected) console.log(`    x ${r}`);
  }
  if (selected.length === 0) throw new Error("Nothing to print.");

  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    serif: await pdfDoc.embedFont(StandardFonts.TimesRoman),
  };
  const content = {
    issue: opts.issue,
    hook: opts.hook,
    worlds: artists.map((h) => `@${h}`),
    footer: PROMISE,
  };

  drawElsewhereCover(pdfDoc, fonts, PAGE, opts.cover, content);

  // The plate pages are the production renderer, unchanged. The only editorial
  // decision here is the caption: the handle, and nothing else. We have no
  // title from the artist, and inventing one would be writing for them.
  const artworkPage = new ArtworkPageService();
  for (const plate of selected) {
    const isJpeg = plate.format === "jpeg";
    const isPng = plate.format === "png";
    const bytes =
      isJpeg || isPng
        ? await readFile(plate.path)
        : await sharp(plate.path).jpeg({ quality: 95 }).toBuffer();

    await artworkPage.addPageAsync(
      pdfDoc,
      bytes,
      isPng ? "image/png" : "image/jpeg",
      plate.width > plate.height ? "LANDSCAPE" : "PORTRAIT",
      PAGE,
      { text: `@${plate.handle}`, font: fonts.regular },
    );
  }

  // Perfect binding needs an even leaf count once the back cover lands.
  if (pdfDoc.getPageCount() % 2 === 0) {
    pdfDoc.addPage([PAGE.widthPt, PAGE.heightPt]);
  }
  if (opts.promise) {
    drawElsewhereBackCover(pdfDoc, fonts, PAGE, content);
  } else {
    pdfDoc.addPage([PAGE.widthPt, PAGE.heightPt]);
  }

  const pageCount = pdfDoc.getPageCount();
  let bytes: Uint8Array = await pdfDoc.save();
  if (opts.colour === "cmyk") {
    bytes = await new PdfXProcessorService().postProcessToPDFX(bytes);
  }

  await writeFile(opts.out, bytes);
  await writeFile(
    `${opts.out}.manifest.json`,
    `${JSON.stringify(
      {
        issue: opts.issue,
        format: opts.format,
        colour: opts.colour,
        cover: opts.cover,
        pageCount,
        artists,
        plates: selected.map((p, i) => ({
          page: i + 2,
          handle: p.handle,
          file: p.file,
          pixels: `${p.width}x${p.height}`,
          dpi: p.dpi,
        })),
        rejected,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `\n✓ ${opts.out}\n  ${pageCount} pages, ${opts.format}, ${opts.colour.toUpperCase()}, ${(bytes.length / 1024 / 1024).toFixed(1)}MB` +
      `\n  manifest → ${opts.out}.manifest.json`,
  );
  if (pageCount < 20) {
    console.log(
      `\n  NOTE: Peecho's softcover square minimum is 20 pages; this is ${pageCount}.`,
    );
  }
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
