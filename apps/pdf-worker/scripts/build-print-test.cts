#!/usr/bin/env tsx
/**
 * Build a physical print-test booklet.
 *
 * Same cover and artwork pages as production — this drives the real
 * CoverPageService and ArtworkPageService — with four calibration pages
 * inserted up front so the printed object can be measured rather than
 * admired.
 *
 * The one thing it can vary that production cannot: the colour path.
 * Peecho's own guidance is that their suppliers require RGB and that a CMYK
 * upload is converted back to RGB before production. Our pipeline currently
 * forces CMYK/FOGRA39, so the file makes a full round trip. `--colour rgb`
 * skips that conversion; ordering both and comparing is the experiment.
 *
 * Usage:
 *   npx tsx scripts/build-print-test.cts --colour rgb  --plates 20 --out ~/Downloads/test-rgb.pdf
 *   npx tsx scripts/build-print-test.cts --colour cmyk --plates 20 --out ~/Downloads/test-cmyk.pdf
 *
 *   --colour rgb|cmyk    rgb leaves the PDF as authored (recommended by Peecho);
 *                        cmyk runs the current PDF/X-3 FOGRA39 conversion
 *   --plates <n>         artwork plates to include (default 20)
 *   --per-artist <n>     max plates per artist, 0 = unlimited (default 2)
 *   --source <dir>       collects folder (default ~/Downloads/art-collect)
 *   --out <file>         output PDF
 *   --issue <label>      cover issue label
 *   --format <fmt>       page format (default A5_PORTRAIT; SQUARE_210 for the
 *                        210x210 softcover photobook)
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join, resolve } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import {
  gradePlate,
  orientationFromPixels,
  PAGE_DIMENSIONS,
  type PlateGrade,
  plateDpi,
} from "@printfeed/print-geometry";
import {
  DEFAULT_PAGE_FORMAT,
  type PageFormat,
} from "../src/booklet/booklet.types";
import { ArtworkPageService, toWinAnsi } from "../src/booklet/pdf/artwork-page.service";
import { CoverPageService } from "../src/booklet/pdf/cover-page.service";
import { PdfXProcessorService } from "../src/booklet/pdf/pdfx-processor.service";
import {
  drawColourPage,
  drawCreditsPage,
  drawKeyPage,
  drawResolutionLadder,
  drawRulerPage,
} from "./print-test-pages.cts";

const MM_TO_PT = 2.8346;
const mm = (v: number) => v * MM_TO_PT;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
let PAGE = PAGE_DIMENSIONS[DEFAULT_PAGE_FORMAT];

interface Candidate {
  handle: string;
  file: string;
  path: string;
  width: number;
  height: number;
  format: string;
  title: string | null;
  grade: PlateGrade;
  dpi: number;
}

function parseArgs(argv: string[]) {
  const opts = {
    colour: "rgb" as "rgb" | "cmyk",
    plates: 20,
    perArtist: 2,
    source: join(homedir(), "Downloads", "art-collect"),
    out: resolve("print-test.pdf"),
    issue: "Print Test",
    format: DEFAULT_PAGE_FORMAT as PageFormat,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} needs a value`);
      return v;
    };
    if (arg === "--colour" || arg === "--color") {
      const v = next();
      if (v !== "rgb" && v !== "cmyk") throw new Error("--colour must be rgb or cmyk");
      opts.colour = v;
    } else if (arg === "--plates") opts.plates = Number.parseInt(next(), 10);
    else if (arg === "--per-artist") opts.perArtist = Number.parseInt(next(), 10);
    else if (arg === "--source") opts.source = resolve(next());
    else if (arg === "--out") opts.out = resolve(next());
    else if (arg === "--issue") opts.issue = next();
    else if (arg === "--format") {
      const v = next() as PageFormat;
      if (!(v in PAGE_DIMENSIONS)) {
        throw new Error(
          `Unknown format "${v}". Known: ${Object.keys(PAGE_DIMENSIONS).join(", ")}`,
        );
      }
      opts.format = v;
    }
    else throw new Error(`Unknown option: ${arg}`);
  }
  return opts;
}

const THREADS_ACTION_BAR = /Like\d*Reply\d*Repost\d*Share\s*$/;

function titleFromCaption(caption: string | undefined): string | null {
  const first = caption?.split("\n")[0]?.replace(THREADS_ACTION_BAR, "").trim();
  if (!first) return null;
  return first.length > 60 ? `${first.slice(0, 59).trimEnd()}…` : first;
}

async function scan(source: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const dir of (await readdir(source, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    const dirPath = join(source, dir);
    let meta: { handle?: string; caption?: string } = {};
    try {
      meta = JSON.parse(await readFile(join(dirPath, "metadata.json"), "utf8"));
    } catch {
      // The directory name still carries the handle, which is what a credit needs.
    }
    const handle = meta.handle ?? dir.split("__")[0];
    const title = titleFromCaption(meta.caption);

    for (const file of (await readdir(dirPath)).sort()) {
      if (!IMAGE_EXTENSIONS.has(extname(file).toLowerCase())) continue;
      const path = join(dirPath, file);
      const { width, height, format } = await sharp(path).metadata();
      if (!width || !height) continue;

      const plate = {
        imageWidthPx: width,
        imageHeightPx: height,
        orientation: orientationFromPixels(width, height),
        page: PAGE,
        hasCaption: true,
      };
      const grade = gradePlate(plate);
      if (grade === "REJECT") continue;

      out.push({
        handle,
        file,
        path,
        width,
        height,
        format: format ?? "unknown",
        title,
        grade,
        dpi: Math.round(plateDpi(plate)),
      });
    }
  }
  return out;
}

/**
 * Grouped by artist and contiguous, so the printed object can be read for
 * whether an artist's run holds together and whether the boundary between two
 * artists lands. That grouping is what the curation question is about.
 */
function select(candidates: Candidate[], perArtist: number, limit: number) {
  const byHandle = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const bucket = byHandle.get(c.handle) ?? [];
    bucket.push(c);
    byHandle.set(c.handle, bucket);
  }
  const grouped = [...byHandle.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, items]) =>
      [...items]
        .sort((a, b) => b.dpi - a.dpi)
        .slice(0, perArtist > 0 ? perArtist : items.length),
    );
  return limit > 0 ? grouped.slice(0, limit) : grouped;
}

/**
 * Artwork falls apart at low resolution at very different rates, so the floor
 * has to be judged against more than one kind of picture. These three span the
 * range we actually publish; each falls back to the next-highest-resolution
 * plate from a distinct artist if the named one is not in the folder.
 */
const LADDER_ARCHETYPES = [
  {
    handle: "anastasiatrusovaart",
    archetype: "Dense texture, high-contrast detail, saturated - fails earliest",
  },
  {
    handle: "georgiahartstudios",
    archetype: "Soft tonal, near-neutral - hides softness, shows banding",
  },
  {
    handle: "postwook",
    archetype: "Flat graphic, hard edge, large flat field - survives almost anything",
  },
];

/** Deterministic shuffles, so a printed key always matches its book. */
const LADDER_ORDERS = [
  [250, 150, 300, 200],
  [200, 300, 150, 250],
  [150, 250, 200, 300],
];

function pickLadderSources(candidates: Candidate[]): {
  source: Candidate;
  archetype: string;
}[] {
  const best = new Map<string, Candidate>();
  for (const c of [...candidates].sort((a, b) => b.dpi - a.dpi)) {
    if (!best.has(c.handle)) best.set(c.handle, c);
  }
  const used = new Set<string>();
  const fallback = [...best.values()].sort((a, b) => b.dpi - a.dpi);

  return LADDER_ARCHETYPES.map(({ handle, archetype }) => {
    const named = best.get(handle);
    const source =
      named && !used.has(handle)
        ? named
        : fallback.find((c) => !used.has(c.handle));
    if (!source) throw new Error("Not enough distinct artists for the ladders");
    used.add(source.handle);
    return { source, archetype };
  });
}

/** Four crops of one image at identical printed size, different pixel counts. */
async function buildLadder(
  source: Candidate,
  cellW: number,
  cellH: number,
  order: number[],
) {
  const aspect = cellW / cellH;
  const srcAspect = source.width / source.height;
  const cropW = srcAspect > aspect ? Math.round(source.height * aspect) : source.width;
  const cropH = srcAspect > aspect ? source.height : Math.round(source.width / aspect);

  const base = sharp(source.path).extract({
    left: Math.floor((source.width - cropW) / 2),
    top: Math.floor((source.height - cropH) / 2),
    width: cropW,
    height: cropH,
  });
  const cropped = await base.toBuffer();

  const letters = ["A", "B", "C", "D"];
  const cells = [];
  const mapping = [];
  for (const [i, dpi] of order.entries()) {
    const pxW = Math.round((cellW / 72) * dpi);
    const pxH = Math.round((cellH / 72) * dpi);
    // Down to the target pixel count, then back up to a constant embed size —
    // this is what a low-res plate actually goes through on press. Every cell
    // is re-encoded at the same JPEG quality, including 300, so compression is
    // not silently a second variable.
    const jpeg = await sharp(cropped)
      .resize(pxW, pxH, { fit: "fill" })
      .jpeg({ quality: 95 })
      .toBuffer();
    cells.push({ letter: letters[i], jpeg });
    mapping.push({ letter: letters[i], dpi });
  }
  return { cells, mapping };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  PAGE = PAGE_DIMENSIONS[opts.format];
  console.log(`Scanning ${opts.source}… (${opts.format})`);

  const candidates = await scan(opts.source);
  const selected = select(candidates, opts.perArtist, opts.plates);
  const artists = [...new Set(selected.map((c) => c.handle))];

  const ladderSources = pickLadderSources(candidates);
  console.log(`  ${selected.length} plates from ${artists.length} artists`);
  for (const { source, archetype } of ladderSources) {
    console.log(`  ladder @${source.handle} ${source.dpi}dpi — ${archetype}`);
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const cover = new CoverPageService();
  const artworkPage = new ArtworkPageService();

  await cover.addFrontCover(
    pdfDoc,
    font,
    opts.issue,
    artists.map((h) => `@${h}`),
    PAGE,
  );

  // Calibration first, so a reviewer meets the instruments before the art.
  drawRulerPage(pdfDoc, font, PAGE);
  drawColourPage(pdfDoc, font, PAGE, opts.colour.toUpperCase());
  drawCreditsPage(pdfDoc, font, PAGE);

  const cellW = (PAGE.widthPt - mm(20) - mm(5)) / 2;
  // 1.22 keeps two rows plus their labels above the 10mm margin on A5.
  const cellH = cellW * 1.22;
  const ladderKeys = [];
  for (const [i, { source, archetype }] of ladderSources.entries()) {
    const { cells, mapping } = await buildLadder(
      source,
      cellW,
      cellH,
      LADDER_ORDERS[i],
    );
    await drawResolutionLadder(
      pdfDoc,
      font,
      PAGE,
      cells,
      cellW,
      cellH,
      i + 1,
      `${archetype}  (@${source.handle})`,
    );
    ladderKeys.push({ archetype: `@${source.handle}`, mapping });
  }

  // Real plates, through the real renderer.
  for (const c of selected) {
    const isJpeg = c.format === "jpeg";
    const isPng = c.format === "png";
    const buf =
      isJpeg || isPng
        ? await readFile(c.path)
        : await sharp(c.path).jpeg({ quality: 95 }).toBuffer();

    const title = toWinAnsi(c.title ?? "");
    const creator = toWinAnsi(`@${c.handle}`);
    const text = title && creator ? `${title} — ${creator}` : creator || title;

    await artworkPage.addPageAsync(
      pdfDoc,
      buf,
      isPng ? "image/png" : "image/jpeg",
      c.width > c.height ? "LANDSCAPE" : "PORTRAIT",
      PAGE,
      text ? { text, font } : undefined,
    );
  }

  drawKeyPage(pdfDoc, font, PAGE, ladderKeys);

  if (pdfDoc.getPageCount() % 2 === 0) {
    pdfDoc.addPage([PAGE.widthPt, PAGE.heightPt]);
  }
  await cover.addBackCover(pdfDoc, PAGE);

  const pageCount = pdfDoc.getPageCount();
  let bytes: Uint8Array = await pdfDoc.save();

  if (opts.colour === "cmyk") {
    console.log("Converting to PDF/X-3 CMYK (FOGRA39) — the current pipeline…");
    bytes = await new PdfXProcessorService().postProcessToPDFX(bytes);
  } else {
    console.log("Leaving RGB as authored — what Peecho asks for.");
  }

  await writeFile(opts.out, bytes);
  await writeFile(
    `${opts.out}.manifest.json`,
    `${JSON.stringify(
      {
        issue: opts.issue,
        format: opts.format,
        colour: opts.colour,
        pageCount,
        artists,
        ladders: ladderKeys,
        plates: selected.map((c, i) => ({
          page: i + 8, // cover + ruler + colour + credits + 3 ladders
          handle: c.handle,
          file: c.file,
          pixels: `${c.width}×${c.height}`,
          dpi: c.dpi,
          grade: c.grade,
        })),
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `\n✓ ${opts.out}\n  ${pageCount} pages, ${opts.colour.toUpperCase()}, ${(bytes.length / 1024 / 1024).toFixed(1)}MB\n  manifest → ${opts.out}.manifest.json`,
  );
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
