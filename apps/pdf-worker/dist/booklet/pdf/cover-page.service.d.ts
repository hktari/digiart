import { type PDFDocument, type PDFFont, type PDFPage } from "pdf-lib";
export declare class CoverPageService {
    private readonly logger;
    addFrontCover(pdfDoc: PDFDocument, font: PDFFont, issueLabel: string, creatorNames: string[]): Promise<PDFPage>;
    addBackCover(pdfDoc: PDFDocument): Promise<PDFPage>;
}
//# sourceMappingURL=cover-page.service.d.ts.map