import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument, PDFPage, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { PAGE_DIMENSIONS } from "../booklet.types";
import { ArtworkPageService, toWinAnsi } from "./artwork-page.service";

const A5_PORTRAIT = PAGE_DIMENSIONS.A5_PORTRAIT;
const A5_LANDSCAPE = PAGE_DIMENSIONS.A5_LANDSCAPE;
const A4_PORTRAIT = PAGE_DIMENSIONS.A4_PORTRAIT;
const A4_LANDSCAPE = PAGE_DIMENSIONS.A4_LANDSCAPE;
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

  it("should add an A5 landscape page with correct dimensions", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    const page = await service.addPageAsync(
      pdfDoc,
      jpegBuffer,
      "image/jpeg",
      "PORTRAIT",
      A5_LANDSCAPE,
    );

    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(A5_LANDSCAPE.widthPt, 1);
    expect(height).toBeCloseTo(A5_LANDSCAPE.heightPt, 1);
  });

  it("should add an A4 landscape page with correct dimensions", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    const page = await service.addPageAsync(
      pdfDoc,
      jpegBuffer,
      "image/jpeg",
      "PORTRAIT",
      A4_LANDSCAPE,
    );

    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(A4_LANDSCAPE.widthPt, 1);
    expect(height).toBeCloseTo(A4_LANDSCAPE.heightPt, 1);
  });

  // Page content streams are Flate-compressed in the saved file, so the drawn
  // text is not recoverable from the bytes. Spying on the draw calls asserts
  // the same thing without decompressing.
  describe("plate caption", () => {
    let drawText: jest.SpyInstance;
    let drawImage: jest.SpyInstance;

    beforeEach(() => {
      drawText = jest.spyOn(PDFPage.prototype, "drawText");
      drawImage = jest.spyOn(PDFPage.prototype, "drawImage");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    async function render(
      caption: string | undefined,
      orientation = "PORTRAIT",
      pageDimensions = A5_PORTRAIT,
    ) {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      await service.addPageAsync(
        pdfDoc,
        await makeSmallJpeg(),
        "image/jpeg",
        orientation,
        pageDimensions,
        caption === undefined ? undefined : { text: caption, font },
      );
      return {
        text: drawText.mock.calls.at(-1),
        image: drawImage.mock.calls.at(-1),
      };
    }

    it("should draw the credit on the page", async () => {
      const { text } = await render("Low Tide — Creator Beta");
      expect(text?.[0]).toBe("Low Tide — Creator Beta");
    });

    it("should keep the credit inside the 10mm safe margin", async () => {
      const { text } = await render("Creator Beta");
      expect(text?.[1].y).toBeGreaterThanOrEqual(MARGIN_PT);
      expect(text?.[1].x).toBeGreaterThanOrEqual(MARGIN_PT);
    });

    it("should lift the image to make room rather than overlap it", async () => {
      const { image: bare } = await render(undefined);
      const { image: captioned } = await render("Creator Alpha");

      // The 4×4 source is width-constrained on a portrait page, so its drawn
      // height is unchanged; only the vertical offset can move.
      expect(captioned?.[1].height).toBeCloseTo(bare?.[1].height, 5);
      expect(captioned?.[1].y).toBeGreaterThan(bare?.[1].y);
    });

    it("should align the credit to a rotated plate's left edge", async () => {
      // A 90° rotation is CCW about the anchor, so the image sits to the LEFT
      // of the reported x. Aligning to the anchor would put the caption at the
      // image's right edge instead.
      const { text, image } = await render("Creator Beta", "LANDSCAPE");
      const [, imageOpts] = image ?? [];
      expect(text?.[1].x).toBeCloseTo(imageOpts.x - imageOpts.height, 5);
    });

    it("should not reserve space for a caption that sanitises to nothing", async () => {
      const { text, image: emojiOnly } = await render("🎨🎨🎨");
      const { image: bare } = await render(undefined);

      expect(text).toBeUndefined();
      expect(emojiOnly?.[1].y).toBeCloseTo(bare?.[1].y, 5);
    });

    it("should not throw on names outside WinAnsi", async () => {
      const { text } = await render("春の海 — @artist🎨");
      expect(text?.[0]).toBe("— @artist");
    });

    it("should truncate a caption too wide for the plate", async () => {
      const { text } = await render(`${"Very Long Title ".repeat(20)}Zed`);
      expect(text?.[0]).toMatch(/\.\.\.$/);
      expect(text?.[0]).not.toContain("Zed");
    });
  });

  describe("toWinAnsi", () => {
    it("keeps Latin-1 accents and typographic punctuation", () => {
      expect(toWinAnsi("Zoë Márquez — “Untitled”")).toBe(
        "Zoë Márquez — “Untitled”",
      );
    });

    it("drops emoji and CJK", () => {
      expect(toWinAnsi("春 art 🎨")).toBe("art");
    });

    it("collapses whitespace and control characters", () => {
      expect(toWinAnsi("  A \n  B  ")).toBe("A B");
    });
  });

  it("should handle landscape image on landscape page without rotation", async () => {
    const pdfDoc = await PDFDocument.create();
    const jpegBuffer = await makeSmallJpeg();

    const page = await service.addPageAsync(
      pdfDoc,
      jpegBuffer,
      "image/jpeg",
      "LANDSCAPE",
      A5_LANDSCAPE,
    );

    expect(page).toBeDefined();
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(A5_LANDSCAPE.widthPt, 1);
    expect(height).toBeCloseTo(A5_LANDSCAPE.heightPt, 1);
  });
});
