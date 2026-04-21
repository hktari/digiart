"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PdfBuilderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfBuilderService = void 0;
const common_1 = require("@nestjs/common");
const pdf_lib_1 = require("pdf-lib");
const artwork_page_service_1 = require("./artwork-page.service");
const cover_page_service_1 = require("./cover-page.service");
const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;
let PdfBuilderService = PdfBuilderService_1 = class PdfBuilderService {
    constructor(artworkPageService, coverPageService) {
        this.artworkPageService = artworkPageService;
        this.coverPageService = coverPageService;
        this.logger = new common_1.Logger(PdfBuilderService_1.name);
    }
    async build(artworks, imageBuffers, issueLabel, creatorNames) {
        var _a;
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        await this.coverPageService.addFrontCover(pdfDoc, font, issueLabel, creatorNames);
        for (const artwork of artworks) {
            const buf = imageBuffers.get(artwork.id);
            if (!buf) {
                this.logger.warn(`No image buffer for artwork ${artwork.id}, skipping`);
                continue;
            }
            const mimeType = (_a = artwork.mimeType) !== null && _a !== void 0 ? _a : "image/jpeg";
            await this.artworkPageService.addPageAsync(pdfDoc, buf, mimeType, artwork.orientation);
        }
        await this.coverPageService.addBackCover(pdfDoc);
        const pageCount = pdfDoc.getPageCount();
        if (pageCount % 2 !== 0) {
            const blank = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
            blank.drawRectangle({
                x: 0,
                y: 0,
                width: PAGE_WIDTH_PT,
                height: PAGE_HEIGHT_PT,
                color: (0, pdf_lib_1.rgb)(1, 1, 1),
            });
        }
        const finalPageCount = pdfDoc.getPageCount();
        const bytes = await pdfDoc.save();
        return { bytes, pageCount: finalPageCount };
    }
};
exports.PdfBuilderService = PdfBuilderService;
exports.PdfBuilderService = PdfBuilderService = PdfBuilderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [artwork_page_service_1.ArtworkPageService,
        cover_page_service_1.CoverPageService])
], PdfBuilderService);
//# sourceMappingURL=pdf-builder.service.js.map