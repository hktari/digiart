#!/usr/bin/env tsx
/**
 * Generate booklet from images stored in MinIO.
 * No Redis, no database, no MVP app needed.
 *
 * Usage: npx tsx scripts/generate-booklet-from-minio.ts [output.pdf]
 *
 * Images are fetched from MinIO bucket based on ARTWORK_KEYS env var.
 */

import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;
const MARGIN_PT = 28.35;

const BEIGE_50 = rgb(0.98, 0.973, 0.957);
const FUCHSIA_600 = rgb(0.753, 0.149, 0.827);
const FUCHSIA_700 = rgb(0.635, 0.11, 0.686);

interface ArtworkImage {
  id: string;
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png";
}

async function fetchFromMinio(key: string): Promise<Buffer> {
  const endpoint = process.env.AWS_ENDPOINT_URL || "http://localhost:9000";
  const bucket = process.env.AWS_S3_BUCKET || "booklets";
  const url = `${endpoint}/${bucket}/${key}`;

  console.log(`  Fetching: ${key}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${key}: ${res.status} ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function loadArtworksFromMinio(): Promise<ArtworkImage[]> {
  // Get artwork keys from env var: ARTWORK_KEYS=key1.jpg,key2.png,key3.jpg
  const keys = process.env.ARTWORK_KEYS;
  if (!keys) {
    throw new Error(
      "ARTWORK_KEYS env var not set. Format: ARTWORK_KEYS=art1.jpg,art2.png,art3.jpg",
    );
  }

  const artworkKeys = keys.split(",").map((k) => k.trim());
  const images: ArtworkImage[] = [];

  for (const key of artworkKeys) {
    const buffer = await fetchFromMinio(key);
    const mimeType = key.endsWith(".png") ? "image/png" : "image/jpeg";
    images.push({ id: key, buffer, mimeType });
  }

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
    // Logo optional
  }

  const issueFontSize = 14;
  const issueTextW = font.widthOfTextAtSize(issueLabel, issueFontSize);
  page.drawText(issueLabel, {
    x: (PAGE_WIDTH_PT - issueTextW) / 2,
    y: PAGE_HEIGHT_PT * 0.55,
    size: issueFontSize,
    font,
    color: FUCHSIA_700,
  });

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

  const isLandscape = image.width > image.height;
  const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
  const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;

  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;
  let rotate = degrees(0);

  if (isLandscape) {
    // pdf-lib rotates 90° CCW around bottom-left anchor (x, y).
    // drawW/drawH are PRE-rotation dimensions — keep original aspect ratio.
    // After rotation: visible width = drawH, visible height = drawW.
    const scale = Math.min(printH / image.width, printW / image.height);
    drawW = image.width * scale;
    drawH = image.height * scale;
    drawX = MARGIN_PT + (printW + drawH) / 2;
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
        opacity: 0.9,
      });
    }
  } catch {
    // Logo optional
  }
}

async function generateBooklet(outputPath: string) {
  const issueLabel = process.env.ISSUE_LABEL || "Test Issue 2026";
  const creatorNames = process.env.CREATOR_NAMES?.split(",") || ["Test Artist"];

  console.log("\n📚 Booklet Generator (MinIO Source)");
  console.log("====================================");

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  console.log("Fetching images from MinIO...");
  const images = await loadArtworksFromMinio();
  console.log(`Loaded ${images.length} images`);

  console.log("Building PDF...");
  await addFrontCover(pdfDoc, font, issueLabel, creatorNames);

  for (const image of images) {
    await addArtworkPage(pdfDoc, image);
  }

  await addBackCover(pdfDoc);

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
  }

  const finalPageCount = pdfDoc.getPageCount();
  const bytes = await pdfDoc.save();

  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, bytes);

  console.log("\n✅ Booklet generated!");
  console.log(`   Pages: ${finalPageCount}`);
  console.log(`   File:  ${resolve(outputPath)}`);
}

const outputPath = process.argv[2] || "./booklet-minio.pdf";

generateBooklet(resolve(outputPath)).catch((err) => {
  console.error("\n❌ Error:", err.message);
  console.log("\nUsage:");
  console.log("  npx tsx scripts/generate-booklet-from-minio.ts [output.pdf]");
  console.log("\nEnvironment variables:");
  console.log(
    "  ARTWORK_KEYS   - Required. Comma-separated MinIO keys (e.g., 'art1.jpg,art2.png')",
  );
  console.log(
    "  AWS_ENDPOINT_URL - MinIO endpoint (default: http://localhost:9000)",
  );
  console.log("  AWS_S3_BUCKET    - Bucket name (default: booklets)");
  console.log("  ISSUE_LABEL      - Issue label (default: 'Test Issue 2026')");
  console.log(
    "  CREATOR_NAMES    - Comma-separated names (default: 'Test Artist')",
  );
  process.exit(1);
});
