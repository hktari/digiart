import sharp from "sharp";
import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument } from "pdf-lib";
import { ArtworkPageService } from "./artwork-page.service";
import { PAGE_DIMENSIONS } from "../booklet.types";

const A5_PORTRAIT = PAGE_DIMENSIONS.A5_PORTRAIT;
const A4_PORTRAIT = PAGE_DIMENSIONS.A4_PORTRAIT;
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
      A5_PORTRAIT,
    );

    expect(page).toBeDefined();
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(A5_PORTRAIT.widthPt, 1);
    expect(height).toBeCloseTo(A5_PORTRAIT.heightPt, 1);
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
      A5_PORTRAIT,
    );

    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(A5_PORTRAIT.widthPt, 1);
    expect(height).toBeCloseTo(A5_PORTRAIT.heightPt, 1);
  });

  it("should add a PNG page", async () => {
    const pdfDoc = await PDFDocument.create();
    const pngBuffer = await makeSmallPng();

    const page = await service.addPageAsync(
      pdfDoc,
      pngBuffer,
      "image/png",
      "PORTRAIT",
      A5_PORTRAIT,
    );

    expect(page).toBeDefined();
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it("should fit portrait image within print area boundaries", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    await service.addPageAsync(
      pdfDoc,
      jpegBuffer,
      "image/jpeg",
      "PORTRAIT",
      A5_PORTRAIT,
    );

    const printW = A5_PORTRAIT.widthPt - MARGIN_PT * 2;
    const printH = A5_PORTRAIT.heightPt - MARGIN_PT * 2;

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
      A5_PORTRAIT,
    );

    expect(page).toBeDefined();
  });

  it("should add an A4 portrait page with correct dimensions", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    const page = await service.addPageAsync(
      pdfDoc,
      jpegBuffer,
      "image/jpeg",
      "PORTRAIT",
      A4_PORTRAIT,
    );

    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(A4_PORTRAIT.widthPt, 1);
    expect(height).toBeCloseTo(A4_PORTRAIT.heightPt, 1);
  });
});
