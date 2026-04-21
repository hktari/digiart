import { type PDFDocument, type PDFPage } from "pdf-lib";
export declare class ArtworkPageService {
    addPage(pdfDoc: PDFDocument, imageBytes: Uint8Array, mimeType: string, orientation: string): PDFPage;
    addPageAsync(pdfDoc: PDFDocument, imageBytes: Uint8Array, mimeType: string, orientation: string): Promise<PDFPage>;
}
//# sourceMappingURL=artwork-page.service.d.ts.map