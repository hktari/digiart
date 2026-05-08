#!/usr/bin/env tsx
/**
 * Standalone booklet generator - no Redis, no MVP app, no database needed.
 * Usage: npx tsx scripts/generate-booklet-standalone.ts <image-dir> [output.pdf]
 *
 * Example:
 *   npx tsx scripts/generate-booklet-standalone.ts /path/to/artwork-images ./test-booklet.pdf
 */

import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import {
  readFile,
  readdir,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { join, resolve, extname, basename } from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

// Page format configurations (in points, 1 inch = 72 points)
const PAGE_FORMATS = {
  A6: { width: 419.53, height: 595.28, margin: 28.35 },
  A5: { width: 595.28, height: 841.89, margin: 42.52 },
  A4: { width: 841.89, height: 595.28, margin: 56.69 }, // Landscape
  A4_PORTRAIT: { width: 595.28, height: 841.89, margin: 56.69 },
};

type PageFormat = keyof typeof PAGE_FORMATS;

let PAGE_WIDTH_PT = 419.53; // Default A6 width
let PAGE_HEIGHT_PT = 595.28; // Default A6 height
let MARGIN_PT = 28.35; // Default margin

const BEIGE_50 = rgb(0.98, 0.973, 0.957);
const FUCHSIA_600 = rgb(0.753, 0.149, 0.827);
const FUCHSIA_700 = rgb(0.635, 0.11, 0.686);

interface ArtworkImage {
  id: string;
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png";
  orientation: "PORTRAIT" | "LANDSCAPE";
}

async function loadImagesFromDir(dir: string): Promise<ArtworkImage[]> {
  const files = await readdir(dir);
  const images: ArtworkImage[] = [];

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") continue;

    const path = join(dir, file);
    const buffer = await readFile(path);
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

    images.push({
      id: basename(file, ext),
      buffer,
      mimeType,
      orientation: "PORTRAIT", // Default, will auto-detect
    });
  }

  console.log(`Loaded ${images.length} images from ${dir}`);
  return images;
}

async function addFrontCover(
  pdfDoc: PDFDocument,
  font: any,
  issueLabel: string,
  creatorNames: string[],
) {
  const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
    color: BEIGE_50,
  });

  // Try to add logo
  try {
    const logoPath = resolve(
      process.cwd(),
      "../../apps/landing/public/logo.png",
    );
    if (existsSync(logoPath)) {
      const logoBytes = await readFile(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoMaxW = PAGE_WIDTH_PT * 0.4;
      const scale = logoMaxW / logoImage.width;
      const logoW = logoImage.width * scale;
      const logoH = logoImage.height * scale;

      page.drawImage(logoImage, {
        x: (PAGE_WIDTH_PT - logoW) / 2,
        y: PAGE_HEIGHT_PT * 0.62,
        width: logoW,
        height: logoH,
      });
    }
  } catch {
    console.log("Logo not found, skipping");
  }

  // Issue label
  const issueFontSize = 14;
  const issueTextW = font.widthOfTextAtSize(issueLabel, issueFontSize);
  page.drawText(issueLabel, {
    x: (PAGE_WIDTH_PT - issueTextW) / 2,
    y: PAGE_HEIGHT_PT * 0.55,
    size: issueFontSize,
    font,
    color: FUCHSIA_700,
  });

  // Byline
  const byline = creatorNames.length === 1 ? creatorNames[0] : "Selected Works";
  const bylineFontSize = 10;
  const bylineW = font.widthOfTextAtSize(byline, bylineFontSize);
  page.drawText(byline, {
    x: (PAGE_WIDTH_PT - bylineW) / 2,
    y: PAGE_HEIGHT_PT * 0.5,
    size: bylineFontSize,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
}

async function addArtworkPage(pdfDoc: PDFDocument, artwork: ArtworkImage) {
  const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  // White background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
    color: rgb(1, 1, 1),
  });

  const image =
    artwork.mimeType === "image/png"
      ? await pdfDoc.embedPng(artwork.buffer)
      : await pdfDoc.embedJpg(artwork.buffer);

  // Auto-detect orientation based on image dimensions
  const isImageLandscape = image.width > image.height;
  const isPageLandscape = PAGE_WIDTH_PT > PAGE_HEIGHT_PT;
  const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
  const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;

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
    drawY = MARGIN_PT + (printH - drawW) / 2;
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
}

async function addBackCover(pdfDoc: PDFDocument) {
  const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
    color: FUCHSIA_600,
  });

  // Try to add logo
  try {
    const logoPath = resolve(
      process.cwd(),
      "../../apps/landing/public/logo.png",
    );
    if (existsSync(logoPath)) {
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
      });
    }
  } catch {
    console.log("Logo not found, skipping back cover logo");
  }
}

async function postProcessToPDFX(inputBytes: Uint8Array): Promise<Uint8Array> {
  const tempDir = await mkdtemp(join(tmpdir(), "pdfx-"));
  const inputPath = join(tempDir, "input.pdf");
  const outputPath = join(tempDir, "output.pdf");
  const prefixPath = join(tempDir, "pdfx-prefix.ps");

  try {
    await writeFile(inputPath, inputBytes);

    const iccProfilePath = resolve(process.cwd(), "profiles", "FOGRA39.icc");
    const prefixContent = `%!
% PDF/X-3 output intent — FOGRA39 / ISO Coated v2
% Based on GhostScript's PDFX_def.ps template

[ /GTS_PDFXVersion (PDF/X-3:2002)
  /Trapped /False
/DOCINFO pdfmark

/ICCProfile (${iccProfilePath}) def

currentdict /ICCProfile known {
  [/_objdef {icc_PDFX} /type /stream /OBJ pdfmark
  [{icc_PDFX} << /N 4 >> /PUT pdfmark
  [{icc_PDFX} ICCProfile (r) file /PUT pdfmark
} if

[/_objdef {OutputIntent_PDFX} /type /dict /OBJ pdfmark
[{OutputIntent_PDFX} <<
  /Type /OutputIntent
  /S /GTS_PDFX
  /OutputCondition (FOGRA39)
  /OutputConditionIdentifier (FOGRA39)
  /RegistryName (http://www.color.org)
  /Info (ISO Coated v2 \\(ECI\\))
  currentdict /ICCProfile known { /DestOutputProfile {icc_PDFX} } if
>> /PUT pdfmark
[{Catalog} <</OutputIntents [ {OutputIntent_PDFX} ]>> /PUT pdfmark
`;
    await writeFile(prefixPath, prefixContent);

    const gsArgs = [
      "-sDEVICE=pdfwrite",
      "-dPDFX",
      "-dBATCH",
      "-dNOPAUSE",
      "-dNOOUTERSAVE",
      "-dNOSAFER",
      "-dPDFSETTINGS=/prepress",
      "-sProcessColorModel=DeviceCMYK",
      "-sColorConversionStrategy=CMYK",
      "-sColorConversionStrategyForImages=CMYK",
      "-dHaveTransparency=false",
      "-dEmbedAllFonts=true",
      "-dSubsetFonts=true",
      "-dMaxSubsetPct=100",
      `-sOutputFile=${outputPath}`,
      prefixPath,
      inputPath,
    ];

    await new Promise<void>((res, rej) => {
      const proc = spawn("gs", gsArgs, { timeout: 120000 });
      let stderr = "";
      proc.stderr?.on("data", (d: Buffer) => {
        stderr += d.toString();
      });
      proc.on("error", (e: Error) =>
        rej(new Error(`GhostScript spawn failed: ${e.message}`)),
      );
      proc.on("close", (code: number) => {
        if (code === 0) res();
        else
          rej(
            new Error(
              `GhostScript exited ${code}. stderr: ${stderr || "(empty)"}`,
            ),
          );
      });
    });

    const outputBytes = await readFile(outputPath);
    return new Uint8Array(outputBytes);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function generateBooklet(
  imageDir: string,
  outputPath: string,
  options: {
    issueLabel?: string;
    creatorNames?: string[];
    format?: PageFormat;
  } = {},
) {
  const issueLabel = options.issueLabel || "Test Issue 2026";
  const creatorNames = options.creatorNames || ["Test Artist"];
  const format = options.format || "A6";

  // Set page dimensions based on format
  const pageConfig = PAGE_FORMATS[format];
  PAGE_WIDTH_PT = pageConfig.width;
  PAGE_HEIGHT_PT = pageConfig.height;
  MARGIN_PT = pageConfig.margin;

  console.log("\n📚 Booklet Generator");
  console.log("====================");
  console.log(
    `Format: ${format} (${PAGE_WIDTH_PT.toFixed(0)}x${PAGE_HEIGHT_PT.toFixed(0)}pt)`,
  );

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const images = await loadImagesFromDir(imageDir);
  if (images.length === 0) {
    throw new Error(`No images found in ${imageDir}`);
  }

  // Front cover
  console.log("Adding front cover...");
  await addFrontCover(pdfDoc, font, issueLabel, creatorNames);

  // Artwork pages
  console.log(`Adding ${images.length} artwork pages...`);
  for (const image of images) {
    await addArtworkPage(pdfDoc, image);
  }

  // Back cover
  console.log("Adding back cover...");
  await addBackCover(pdfDoc);

  // Ensure even page count (add blank if needed)
  const pageCount = pdfDoc.getPageCount();
  if (pageCount % 2 !== 0) {
    const blank = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    blank.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH_PT,
      height: PAGE_HEIGHT_PT,
      color: rgb(1, 1, 1),
    });
    console.log("Added blank page for even page count");
  }

  const finalPageCount = pdfDoc.getPageCount();
  const rawBytes = await pdfDoc.save();

  console.log(`\nPost-processing with GhostScript (CMYK / PDF/X-4)...`);
  let finalBytes: Uint8Array;
  try {
    finalBytes = await postProcessToPDFX(rawBytes);
    console.log(
      `   GhostScript OK: ${rawBytes.length} → ${finalBytes.length} bytes`,
    );
  } catch (err) {
    console.warn(
      `   ⚠ GhostScript failed, saving raw PDF: ${(err as Error).message}`,
    );
    finalBytes = rawBytes;
  }

  // Ensure output directory exists
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, finalBytes);

  console.log("\n✅ Booklet generated successfully!");
  console.log(`   Pages: ${finalPageCount}`);
  console.log(`   Output: ${resolve(outputPath)}`);
}

// CLI
const imageDir = process.argv[2];
const outputPath = process.argv[3] || "./booklet-test.pdf";

if (!imageDir) {
  console.log(
    "Usage: npx tsx scripts/generate-booklet-standalone.ts <image-dir> [output.pdf]",
  );
  console.log("");
  console.log("Example:");
  console.log(
    "  npx tsx scripts/generate-booklet-standalone.ts ~/my-artwork ./test.pdf",
  );
  console.log("");
  console.log("Environment variables:");
  console.log("  ISSUE_LABEL    - Issue label (default: 'Test Issue 2026')");
  console.log("  CREATOR_NAMES  - Comma-separated creator names");
  console.log(
    "  PAGE_FORMAT    - Page format: A6, A5, A4, A4_PORTRAIT (default: A6)",
  );
  process.exit(1);
}

const pageFormat = (process.env.PAGE_FORMAT || "A6") as PageFormat;
if (!PAGE_FORMATS[pageFormat]) {
  console.error(
    `Invalid PAGE_FORMAT: ${pageFormat}. Valid options: ${Object.keys(PAGE_FORMATS).join(", ")}`,
  );
  process.exit(1);
}

generateBooklet(resolve(imageDir), resolve(outputPath), {
  issueLabel: process.env.ISSUE_LABEL,
  creatorNames: process.env.CREATOR_NAMES?.split(",") || ["Test Artist"],
  format: pageFormat,
}).catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
