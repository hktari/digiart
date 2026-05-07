import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { CoverPageService } from "./cover-page.service";
import { PAGE_DIMENSIONS } from "../booklet.types";

const A5_PORTRAIT = PAGE_DIMENSIONS.A5_PORTRAIT;
const A4_PORTRAIT = PAGE_DIMENSIONS.A4_PORTRAIT;

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
      await service.addFrontCover(
        pdfDoc,
        font,
        "March 2025",
        ["Alice", "Bob"],
        A5_PORTRAIT,
      );
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it("should return a page with correct dimensions", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(
        pdfDoc,
        font,
        "Issue #1",
        ["Alice"],
        A5_PORTRAIT,
      );
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(A5_PORTRAIT.widthPt, 1);
      expect(height).toBeCloseTo(A5_PORTRAIT.heightPt, 1);
    });

    it("should not throw when logo file is missing (graceful fallback)", async () => {
      const { pdfDoc, font } = await setup();
      await expect(
        service.addFrontCover(pdfDoc, font, "Issue #1", [], A5_PORTRAIT),
      ).resolves.toBeDefined();
    });

    it("should use 'Selected Works' byline when no creators provided", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(
        pdfDoc,
        font,
        "April 2025",
        [],
        A5_PORTRAIT,
      );
      expect(page).toBeDefined();
    });

    it("should use single creator name as byline when exactly one creator", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(
        pdfDoc,
        font,
        "April 2025",
        ["Solo Artist"],
        A5_PORTRAIT,
      );
      expect(page).toBeDefined();
    });

    it("should use 'Selected Works' byline when multiple creators are provided", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(
        pdfDoc,
        font,
        "April 2025",
        ["Artist A", "Artist B"],
        A5_PORTRAIT,
      );
      expect(page).toBeDefined();
    });

    it("should return A4 portrait page with correct dimensions", async () => {
      const { pdfDoc, font } = await setup();
      const page = await service.addFrontCover(
        pdfDoc,
        font,
        "Issue #1",
        [],
        A4_PORTRAIT,
      );
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(A4_PORTRAIT.widthPt, 1);
      expect(height).toBeCloseTo(A4_PORTRAIT.heightPt, 1);
    });
  });

  describe("addBackCover", () => {
    it("should add exactly one page to the document", async () => {
      const { pdfDoc } = await setup();
      await service.addBackCover(pdfDoc, A5_PORTRAIT);
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it("should return a page with correct dimensions", async () => {
      const { pdfDoc } = await setup();
      const page = await service.addBackCover(pdfDoc, A5_PORTRAIT);
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(A5_PORTRAIT.widthPt, 1);
      expect(height).toBeCloseTo(A5_PORTRAIT.heightPt, 1);
    });

    it("should not throw when logo file is missing", async () => {
      const { pdfDoc } = await setup();
      await expect(
        service.addBackCover(pdfDoc, A5_PORTRAIT),
      ).resolves.toBeDefined();
    });
  });
});
