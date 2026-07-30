#!/usr/bin/env tsx
/**
 * Build a demo booklet from a folder of collects, using the real production
 * PDF services — no Redis, no database, no MVP app.
 *
 * Unlike generate-booklet-standalone.ts, which carries its own copy of the
 * page-drawing logic and has drifted from it, this drives PdfBuilderService
 * directly. What comes out is byte-for-byte what the queue would produce, so
 * a proof print here actually proves the pipeline.
 *
 * Input is the layout the Threads collector extension writes:
 *
 *   <source>/<handle>__<shortcode>/
 *       metadata.json   # handle, postUrl, caption, images[]
 *       01.jpg 02.jpg | single_<n>.jpg | *.webp
 *
 * Usage:
 *   npx tsx scripts/build-demo-booklet.cts [options]
 *
 * (.cts, not .ts: scripts/package.json declares type=module, and importing the
 * CommonJS services from an ESM entry point fails to resolve their exports.)
 *
 *   --source <dir>       collects folder (default ~/Downloads/art-collect)
 *   --out <file>         output PDF (default ./demo-booklet.pdf)
 *   --issue <label>      cover issue label (default "Demo Issue")
 *   --per-artist <n>     max plates per artist, 0 = unlimited (default 2)
 *   --format <fmt>       page format (default A5_PORTRAIT)
 *   --dry-run            report the selection without building
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";
import {
  type ArtworkRecord,
  DEFAULT_PAGE_FORMAT,
  MIN_HEIGHT_PX,
  MIN_WIDTH_PX,
  PAGE_DIMENSIONS,
  type PageFormat,
} from "../src/booklet/booklet.types";
import { ArtworkPageService } from "../src/booklet/pdf/artwork-page.service";
import { CoverPageService } from "../src/booklet/pdf/cover-page.service";
import { PdfBuilderService } from "../src/booklet/pdf/pdf-builder.service";
import { PdfXProcessorService } from "../src/booklet/pdf/pdfx-processor.service";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_TITLE_LENGTH = 60;

interface CollectMetadata {
  handle?: string;
  postUrl?: string;
  caption?: string;
}

interface Candidate {
  handle: string;
  file: string;
  path: string;
  width: number;
  height: number;
  format: string;
  title: string | null;
}

interface Rejected {
  handle: string;
  file: string;
  reason: string;
}

function parseArgs(argv: string[]) {
  const opts = {
    source: join(homedir(), "Downloads", "art-collect"),
    out: resolve("demo-booklet.pdf"),
    issue: "Demo Issue",
    perArtist: 2,
    format: DEFAULT_PAGE_FORMAT as PageFormat,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };

    if (arg === "--source") opts.source = resolve(next());
    else if (arg === "--out") opts.out = resolve(next());
    else if (arg === "--issue") opts.issue = next();
    else if (arg === "--per-artist")
      opts.perArtist = Number.parseInt(next(), 10);
    else if (arg === "--format") opts.format = next() as PageFormat;
    else if (arg === "--dry-run") opts.dryRun = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!(opts.format in PAGE_DIMENSIONS)) {
    throw new Error(
      `Unknown format "${opts.format}". Known: ${Object.keys(PAGE_DIMENSIONS).join(", ")}`,
    );
  }
  return opts;
}

/**
 * The extension's caption capture is best-effort (Threads obfuscates its DOM),
 * so it picks up interface chrome alongside the text. Two forms show up:
 * counts on their own trailing lines ("my art in red\n445\n8\n26") and the
 * action bar glued straight onto the caption
 * ("…SwitzerlandLike113Reply2Repost6Share").
 */
const THREADS_ACTION_BAR = /Like\d*Reply\d*Repost\d*Share\s*$/;

function titleFromCaption(caption: string | undefined): string | null {
  const first = caption?.split("\n")[0]?.replace(THREADS_ACTION_BAR, "").trim();
  if (!first) return null;
  return first.length > MAX_TITLE_LENGTH
    ? `${first.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    : first;
}

async function scan(source: string) {
  const candidates: Candidate[] = [];
  const rejected: Rejected[] = [];

  for (const dir of (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    const dirPath = join(source, dir);

    let metadata: CollectMetadata = {};
    try {
      metadata = JSON.parse(
        await readFile(join(dirPath, "metadata.json"), "utf8"),
      );
    } catch {
      // A collect without metadata still has usable images; the directory name
      // carries the handle, which is the part the credit actually needs.
    }
    const handle = metadata.handle ?? dir.split("__")[0];
    const title = titleFromCaption(metadata.caption);

    for (const file of (await readdir(dirPath)).sort()) {
      if (!IMAGE_EXTENSIONS.has(extname(file).toLowerCase())) continue;
      const path = join(dirPath, file);

      const { width, height, format } = await sharp(path).metadata();
      if (!width || !height) {
        rejected.push({ handle, file, reason: "unreadable image" });
        continue;
      }
      if (width < MIN_WIDTH_PX || height < MIN_HEIGHT_PX) {
        rejected.push({
          handle,
          file,
          reason: `${width}×${height} below the ${MIN_WIDTH_PX}×${MIN_HEIGHT_PX} print floor`,
        });
        continue;
      }

      candidates.push({
        handle,
        file,
        path,
        width,
        height,
        format: format ?? "unknown",
        title,
      });
    }
  }

  return { candidates, rejected };
}

/** Round-robin across artists so no single handle dominates the front. */
function select(candidates: Candidate[], perArtist: number): Candidate[] {
  const byHandle = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const bucket = byHandle.get(candidate.handle) ?? [];
    bucket.push(candidate);
    byHandle.set(candidate.handle, bucket);
  }

  return [...byHandle.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, items]) =>
      perArtist > 0 ? items.slice(0, perArtist) : items,
    );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log(`Scanning ${opts.source}…\n`);

  const { candidates, rejected } = await scan(opts.source);
  const selected = select(candidates, opts.perArtist);
  const artists = new Set(selected.map((c) => c.handle));

  for (const candidate of selected) {
    console.log(
      `  ✓ @${candidate.handle.padEnd(28)} ${candidate.file.padEnd(24)} ${candidate.width}×${candidate.height}`,
    );
  }

  // Never report a selection without saying what fell out of it — a silent cap
  // reads as "everything was usable" when most of it was not.
  console.log(`\n  ${selected.length} plates from ${artists.size} artists`);
  const dropped = candidates.length - selected.length;
  if (dropped > 0) {
    console.log(`  ${dropped} held back by --per-artist ${opts.perArtist}`);
  }
  console.log(`  ${rejected.length} rejected:`);
  for (const item of rejected) {
    console.log(`    ✗ @${item.handle}/${item.file} — ${item.reason}`);
  }

  if (selected.length === 0) throw new Error("Nothing to print.");
  if (opts.dryRun) return;

  // pdf-lib embeds JPEG and PNG only, so anything else (Threads serves plenty
  // of webp) is transcoded at full quality before it reaches the builder.
  const artworks: ArtworkRecord[] = [];
  const buffers = new Map<string, Buffer>();

  for (const [index, candidate] of selected.entries()) {
    const id = `${candidate.handle}-${basename(candidate.file, extname(candidate.file))}-${index}`;
    const isJpeg = candidate.format === "jpeg";
    const isPng = candidate.format === "png";

    buffers.set(
      id,
      isJpeg || isPng
        ? await readFile(candidate.path)
        : await sharp(candidate.path).jpeg({ quality: 95 }).toBuffer(),
    );

    artworks.push({
      id,
      title: candidate.title,
      storageKey: candidate.path,
      mimeType: isPng ? "image/png" : "image/jpeg",
      width: candidate.width,
      height: candidate.height,
      orientation:
        candidate.height >= candidate.width ? "PORTRAIT" : "LANDSCAPE",
      creatorName: `@${candidate.handle}`,
    });
  }

  const builder = new PdfBuilderService(
    new ArtworkPageService(),
    new CoverPageService(),
    new PdfXProcessorService(),
  );

  console.log(`\nBuilding ${opts.format}…`);
  const { bytes, pageCount } = await builder.build(
    artworks,
    buffers,
    opts.issue,
    [...artists].map((handle) => `@${handle}`),
    opts.format,
  );

  await writeFile(opts.out, bytes);
  const { widthPt, heightPt } = PAGE_DIMENSIONS[opts.format];
  const PT_TO_MM = 1 / 2.8346;
  console.log(
    `\n✓ ${opts.out}\n  ${pageCount} pages, ${(widthPt * PT_TO_MM).toFixed(0)}×${(heightPt * PT_TO_MM).toFixed(0)}mm, ${(bytes.length / 1024 / 1024).toFixed(1)}MB`,
  );
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
