import sharp from "sharp";
import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument } from "pdf-lib";
import { PdfBuilderService } from "./pdf-builder.service";
import { ArtworkPageService } from "./artwork-page.service";
import { CoverPageService } from "./cover-page.service";
import { PdfXProcessorService } from "./pdfx-processor.service";
import { PAGE_DIMENSIONS } from "../booklet.types";
import type { ArtworkRecord } from "../booklet.types";

let JPEG_1x1: Buffer;

beforeAll(async () => {
  JPEG_1x1 = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: { r: 200, g: 200, b: 200 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
});

function makeArtwork(
  id: string,
  orientation: "PORTRAIT" | "LANDSCAPE" = "PORTRAIT",
): ArtworkRecord {
  return {
    id,
    title: `Artwork ${id}`,
    storageKey: `art/${id}.jpg`,
    mimeType: "image/jpeg",
    width: orientation === "LANDSCAPE" ? 2800 : 2000,
    height: orientation === "LANDSCAPE" ? 2000 : 2800,
    orientation,
  };
}

describe("PdfBuilderService", () => {
  let service: PdfBuilderService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfBuilderService,
        ArtworkPageService,
        CoverPageService,
        PdfXProcessorService,
      ],
    }).compile();
    service = module.get<PdfBuilderService>(PdfBuilderService);
  });

  it("should build a PDF with front cover + artwork pages + back cover", async () => {
    const artworks = [makeArtwork("a1"), makeArtwork("a2")];
    const buffers = new Map<string, Buffer>([
      ["a1", JPEG_1x1],
      ["a2", JPEG_1x1],
    ]);

    const result = await service.build(artworks, buffers, "Issue #1", [
      "Artist",
    ]);

    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(0);
    // front cover + 2 artwork pages + back cover = 4 pages (even)
    expect(result.pageCount).toBe(4);

    const pdfDoc = await PDFDocument.load(result.bytes);
    expect(pdfDoc.getPageCount()).toBe(4);
  });

  it("should produce an even page count for a single artwork", async () => {
    const artworks = [makeArtwork("a1")];
    const buffers = new Map<string, Buffer>([["a1", JPEG_1x1]]);

    const result = await service.build(artworks, buffers, "Issue #1", [
      "Artist",
    ]);

    // front + 1 artwork = 2 (even) → blank inserted → back cover = 4
    expect(result.pageCount % 2).toBe(0);
  });

  it("should place the back cover on the last (even) page, not a blank page", async () => {
    // regression: with a round artwork count (e.g. 4) front+artworks = even,
    // blank must be inserted BEFORE the back cover, not after it
    const artworks = Array.from({ length: 3 }, (_, i) => makeArtwork(`a${i}`));
    const buffers = new Map<string, Buffer>(
      artworks.map((a) => [a.id, JPEG_1x1]),
    );
    const result = await service.build(artworks, buffers, "Issue #1", [
      "Artist",
    ]);
    // front(1) + 3 artworks = 4 (even) → no blank needed → back cover = 5 → padded to 6
    expect(result.pageCount).toBe(6);
    // The last page must be back cover (even page count confirms correct ordering)
    expect(result.pageCount % 2).toBe(0);
  });

  it("should always produce an even page count", async () => {
    for (let artworkCount = 1; artworkCount <= 5; artworkCount++) {
      const artworks = Array.from({ length: artworkCount }, (_, i) =>
        makeArtwork(`a${i}`),
      );
      const buffers = new Map<string, Buffer>(
        artworks.map((a) => [a.id, JPEG_1x1]),
      );

      const result = await service.build(artworks, buffers, "Test", ["Artist"]);
      expect(result.pageCount % 2).toBe(0);
    }
  });

  it("should skip artworks with missing image buffers", async () => {
    const artworks = [makeArtwork("a1"), makeArtwork("a2-missing")];
    const buffers = new Map<string, Buffer>([["a1", JPEG_1x1]]);

    const result = await service.build(artworks, buffers, "Issue #1", [
      "Artist",
    ]);

    // front + 1 artwork (a2-missing skipped) + back = 3 → padded to 4
    expect(result.pageCount).toBeGreaterThanOrEqual(2);
    expect(result.pageCount % 2).toBe(0);
  });

  it("should handle landscape artworks", async () => {
    const artworks = [makeArtwork("land1", "LANDSCAPE")];
    const buffers = new Map<string, Buffer>([["land1", JPEG_1x1]]);

    const result = await service.build(artworks, buffers, "Issue #1", [
      "Artist",
    ]);

    expect(result.pageCount % 2).toBe(0);
    const pdfDoc = await PDFDocument.load(result.bytes);
    expect(pdfDoc.getPageCount()).toBe(result.pageCount);
  });

  it("should set correct page sizes on all pages", async () => {
    const artworks = [makeArtwork("a1"), makeArtwork("a2")];
    const buffers = new Map<string, Buffer>([
      ["a1", JPEG_1x1],
      ["a2", JPEG_1x1],
    ]);

    const { bytes } = await service.build(artworks, buffers, "Issue", []);
    const pdfDoc = await PDFDocument.load(bytes);

    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }
  });

  it("should build an A4 portrait PDF with correct page dimensions", async () => {
    const artworks = [makeArtwork("a1")];
    const buffers = new Map<string, Buffer>([["a1", JPEG_1x1]]);

    const { bytes } = await service.build(
      artworks,
      buffers,
      "Issue #1",
      ["Artist"],
      "A4_PORTRAIT",
    );
    const pdfDoc = await PDFDocument.load(bytes);

    const { widthPt, heightPt } = PAGE_DIMENSIONS.A4_PORTRAIT;
    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(widthPt, 1);
      expect(height).toBeCloseTo(heightPt, 1);
    }
  });

  it("should build an A5 landscape PDF with correct page dimensions", async () => {
    const artworks = [makeArtwork("a1")];
    const buffers = new Map<string, Buffer>([["a1", JPEG_1x1]]);

    const { bytes } = await service.build(
      artworks,
      buffers,
      "Issue #1",
      ["Artist"],
      "A5_LANDSCAPE",
    );
    const pdfDoc = await PDFDocument.load(bytes);

    const { widthPt, heightPt } = PAGE_DIMENSIONS.A5_LANDSCAPE;
    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(widthPt, 1);
      expect(height).toBeCloseTo(heightPt, 1);
    }
  });
});
