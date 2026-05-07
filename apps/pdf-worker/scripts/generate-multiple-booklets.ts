#!/usr/bin/env tsx
/**
 * Generate multiple booklets with random artwork selections
 */

import { readdir, mkdir, copyFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const ARTWORKS_DIR = resolve(process.cwd(), "test/artworks");
const OUTPUT_DIR = resolve(process.cwd(), "test/output");

// Different page formats to generate
const FORMATS = [
  { name: "a6", pageFormat: "A6" },
  { name: "a5", pageFormat: "A5" },
  { name: "a4-landscape", pageFormat: "A4" },
  { name: "a4-portrait", pageFormat: "A4_PORTRAIT" },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getAllArtworks(): Promise<string[]> {
  const files = await readdir(ARTWORKS_DIR);
  return files.filter((f) => {
    const ext = f.toLowerCase();
    return (
      ext.endsWith(".jpg") ||
      ext.endsWith(".jpeg") ||
      ext.endsWith(".png") ||
      ext.endsWith(".webp")
    );
  });
}

async function createTempDirWithImages(
  artworks: string[],
  count: number,
): Promise<string> {
  const tempDir = join(tmpdir(), `booklet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  await mkdir(tempDir, { recursive: true });

  const shuffled = shuffleArray(artworks);
  const selected = shuffled.slice(0, count);

  for (const artwork of selected) {
    const src = join(ARTWORKS_DIR, artwork);
    const dest = join(tempDir, artwork);
    await copyFile(src, dest);
  }

  console.log(`  Created temp dir with ${count} images: ${tempDir}`);
  return tempDir;
}

async function generateBooklet(
  tempDir: string,
  outputPath: string,
  format: string,
  pageFormat: string,
  issueNumber: number,
): Promise<void> {
  const issueLabel = `${format.toUpperCase()} Edition #${issueNumber}`;

  console.log(`\n📚 Generating ${issueLabel}...`);
  console.log(`   Format: ${pageFormat}`);
  console.log(`   Output: ${outputPath}`);

  const scriptPath = resolve(
    process.cwd(),
    "scripts/generate-booklet-standalone.ts",
  );

  execSync(
    `ISSUE_LABEL="${issueLabel}" PAGE_FORMAT="${pageFormat}" npx tsx "${scriptPath}" "${tempDir}" "${outputPath}"`,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        ISSUE_LABEL: issueLabel,
        PAGE_FORMAT: pageFormat,
      },
    },
  );
}

async function main() {
  console.log("🎨 Multiple Booklet Generator");
  console.log("=============================\n");

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Get all available artworks
  const allArtworks = await getAllArtworks();
  console.log(`Found ${allArtworks.length} artworks in ${ARTWORKS_DIR}\n`);

  if (allArtworks.length < 22) {
    console.error(
      `❌ Not enough artworks! Need at least 22, found ${allArtworks.length}.`,
    );
    process.exit(1);
  }

  // Generate 2 booklets for each format (8 total)
  for (const format of FORMATS) {
    for (let i = 1; i <= 2; i++) {
      const imageCount = randomInt(22, 43); // Random between 22-43 images
      const outputName = `booklet-${format.name}-${i}.pdf`;
      const outputPath = join(OUTPUT_DIR, outputName);

      console.log(`\n[${"=".repeat(50)}]`);
      console.log(`Format: ${format.name} (${format.pageFormat})`);
      console.log(`Selected: ${imageCount} images`);

      // Create temp directory with random selection of images
      const tempDir = await createTempDirWithImages(allArtworks, imageCount);

      try {
        // Generate the booklet
        await generateBooklet(
          tempDir,
          outputPath,
          format.name,
          format.pageFormat,
          i,
        );
        console.log(`✅ Generated: ${outputName}`);
      } catch (error) {
        console.error(`❌ Failed to generate ${outputName}:`, error);
      }

      // Cleanup temp directory
      execSync(`rm -rf "${tempDir}"`);
    }
  }

  console.log("\n\n🎉 All booklets generated!");
  console.log(`   Output directory: ${OUTPUT_DIR}`);
  console.log("\nGenerated files:");
  
  const files = await readdir(OUTPUT_DIR);
  files.forEach((f) => console.log(`   - ${f}`));
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
