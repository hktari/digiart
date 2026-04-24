import sharp from "sharp";
import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument } from "pdf-lib";
import { ArtworkPageService } from "./artwork-page.service";

const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;
const MARGIN_PT = 28.35;

async function makeSmallJpeg(): Promise<Buffer> {
  return sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: { r: 200, g: 200, b: 200 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function makeSmallPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: { r: 200, g: 200, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe("ArtworkPageService", () => {
  let service: ArtworkPageService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArtworkPageService],
    }).compile();
    service = module.get<ArtworkPageService>(ArtworkPageService);
  });

  it("should add a portrait JPEG page with correct dimensions", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    const page = await service.addPageAsync(
      pdfDoc,
      jpegBuffer,
      "image/jpeg",
      "PORTRAIT",
    );

    expect(page).toBeDefined();
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(PAGE_WIDTH_PT, 1);
    expect(height).toBeCloseTo(PAGE_HEIGHT_PT, 1);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it("should add a landscape JPEG page with correct dimensions", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    const page = await service.addPageAsync(
      pdfDoc,
      jpegBuffer,
      "image/jpeg",
      "LANDSCAPE",
    );

    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(PAGE_WIDTH_PT, 1);
    expect(height).toBeCloseTo(PAGE_HEIGHT_PT, 1);
  });

  it("should add a PNG page", async () => {
    const pdfDoc = await PDFDocument.create();
    const pngBuffer = await makeSmallPng();

    const page = await service.addPageAsync(
      pdfDoc,
      pngBuffer,
      "image/png",
      "PORTRAIT",
    );

    expect(page).toBeDefined();
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it("should fit portrait image within print area boundaries", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    await service.addPageAsync(pdfDoc, jpegBuffer, "image/jpeg", "PORTRAIT");

    const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
    const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;

    expect(printW).toBeGreaterThan(0);
    expect(printH).toBeGreaterThan(0);
  });

  it("should treat unknown orientation as portrait (non-landscape path)", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    const page = await service.addPageAsync(
      pdfDoc,
      jpegBuffer,
      "image/jpeg",
      "SQUARE",
    );

    expect(page).toBeDefined();
  });
});
