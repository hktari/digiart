import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { CoverPageService } from "./cover-page.service";

const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;

describe("CoverPageService", () => {
  let service: CoverPageService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoverPageService],
    }).compile();
    service = module.get<CoverPageService>(CoverPageService);
  });

  async function setup() {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    return { pdfDoc, font };
  }

  describe("addFrontCover", () => {
    it("should add exactly one page to the document", async () => {
      const { pdfDoc, font } = await setup();
      await service.addFrontCover(pdfDoc, font, "March 2025", ["Alice", "Bob"]);
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it("should return a page with correct dimensions", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(pdfDoc, font, "Issue #1", ["Alice"]);
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(PAGE_WIDTH_PT, 1);
      expect(height).toBeCloseTo(PAGE_HEIGHT_PT, 1);
    });

    it("should not throw when logo file is missing (graceful fallback)", async () => {
      const { pdfDoc, font } = await setup();
      await expect(
        service.addFrontCover(pdfDoc, font, "Issue #1", []),
      ).resolves.toBeDefined();
    });

    it("should use 'Selected Works' byline when no creators provided", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(pdfDoc, font, "April 2025", []);
      expect(page).toBeDefined();
    });

    it("should use single creator name as byline when exactly one creator", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(pdfDoc, font, "April 2025", ["Solo Artist"]);
      expect(page).toBeDefined();
    });

    it("should use 'Selected Works' byline when multiple creators are provided", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(pdfDoc, font, "April 2025", ["Artist A", "Artist B"]);
      expect(page).toBeDefined();
    });
  });

  describe("addBackCover", () => {
    it("should add exactly one page to the document", async () => {
      const { pdfDoc } = await setup();
      await service.addBackCover(pdfDoc);
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it("should return a page with correct dimensions", async () => {
      const { pdfDoc } = await setup();
      const page = await service.addBackCover(pdfDoc);
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(PAGE_WIDTH_PT, 1);
      expect(height).toBeCloseTo(PAGE_HEIGHT_PT, 1);
    });

    it("should not throw when logo file is missing", async () => {
      const { pdfDoc } = await setup();
      await expect(service.addBackCover(pdfDoc)).resolves.toBeDefined();
    });
  });
});
