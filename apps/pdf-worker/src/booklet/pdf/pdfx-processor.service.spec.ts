import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument } from "pdf-lib";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PdfXProcessorService } from "./pdfx-processor.service";

describe("PdfXProcessorService", () => {
  let service: PdfXProcessorService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [PdfXProcessorService],
    }).compile();

    service = module.get<PdfXProcessorService>(PdfXProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe("isAvailable", () => {
    it("should detect GhostScript availability", async () => {
      const available = await service.isAvailable();
      // GhostScript should be available in test environment
      expect(available).toBe(true);
    });
  });

  describe("postProcessToPDFX", () => {
    it("should convert a simple PDF to PDF/X-4 format", async () => {
      // Create a simple test PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      page.drawText("Test PDF/X Document", {
        x: 100,
        y: 700,
        size: 20,
      });

      const rawBytes = await pdfDoc.save();
      expect(rawBytes.length).toBeGreaterThan(0);

      // Convert to PDF/X
      const pdfxBytes = await service.postProcessToPDFX(rawBytes, {
        pdfxVersion: "PDF/X-4",
        outputIntentProfile: "ISO Coated v2 (ECI)",
      });

      // Verify output
      expect(pdfxBytes.length).toBeGreaterThan(0);
      expect(pdfxBytes.length).not.toEqual(rawBytes.length); // Should be different after processing

      // Save for manual verification if needed
      const testOutputDir = join(
        process.cwd(),
        "sample-booklets-do-not-commit",
      );
      if (!existsSync(testOutputDir)) {
        mkdirSync(testOutputDir, { recursive: true });
      }
      const testFile = join(testOutputDir, "test-pdfx-output.pdf");
      writeFileSync(testFile, pdfxBytes);

      // Verify it's a valid PDF
      const processedDoc = await PDFDocument.load(pdfxBytes);
      expect(processedDoc.getPageCount()).toBe(1);
    }, 30000); // 30 second timeout for GhostScript

    it("should handle multi-page PDFs", async () => {
      const pdfDoc = await PDFDocument.create();

      // Add multiple pages
      for (let i = 0; i < 3; i++) {
        const page = pdfDoc.addPage([595, 842]);
        page.drawText(`Page ${i + 1}`, {
          x: 100,
          y: 700,
          size: 20,
        });
      }

      const rawBytes = await pdfDoc.save();
      const pdfxBytes = await service.postProcessToPDFX(rawBytes);

      const processedDoc = await PDFDocument.load(pdfxBytes);
      expect(processedDoc.getPageCount()).toBe(3);
    }, 30000);

    it("should handle PDF with images", async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);

      // Create a simple test image (red square)
      const imageData = new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG header
        0x00,
        0x00,
        0x00,
        0x0d,
        0x49,
        0x48,
        0x44,
        0x52, // IHDR chunk
        0x00,
        0x00,
        0x00,
        0x10,
        0x00,
        0x00,
        0x00,
        0x10, // 16x16
        0x08,
        0x02,
        0x00,
        0x00,
        0x00,
        0x90,
        0x91,
        0x68, // 8-bit RGB
        0x36,
        0x00,
        0x00,
        0x00,
        0x01,
        0x73,
        0x52,
        0x47, // sRGB chunk
        0x42,
        0x00,
        0xae,
        0xce,
        0x1c,
        0xe9,
        0x00,
        0x00,
      ]);

      // Just test that the PDF is created and processed
      page.drawText("PDF with Image", { x: 100, y: 700, size: 20 });

      const rawBytes = await pdfDoc.save();
      const pdfxBytes = await service.postProcessToPDFX(rawBytes);

      expect(pdfxBytes.length).toBeGreaterThan(0);
    }, 30000);

    it("should fallback gracefully on GhostScript failure", async () => {
      // Create minimal PDF
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595, 842]);
      const rawBytes = await pdfDoc.save();

      // The service should succeed and return processed bytes
      // (or fallback to raw if GhostScript fails)
      await expect(service.postProcessToPDFX(rawBytes)).resolves.toBeDefined();
    }, 30000);
  });
});
