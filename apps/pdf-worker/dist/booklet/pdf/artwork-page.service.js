"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtworkPageService = void 0;
const common_1 = require("@nestjs/common");
const pdf_lib_1 = require("pdf-lib");
const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;
const MARGIN_PT = 28.35;
let ArtworkPageService = class ArtworkPageService {
    addPage(pdfDoc, imageBytes, mimeType, orientation) {
        const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
        page.drawRectangle({
            x: 0,
            y: 0,
            width: PAGE_WIDTH_PT,
            height: PAGE_HEIGHT_PT,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        const embed = mimeType === "image/png"
            ? pdfDoc.embedPng(imageBytes)
            : pdfDoc.embedJpg(imageBytes);
        void Promise.resolve(embed).then((image) => {
            const isLandscape = orientation === "LANDSCAPE";
            const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
            const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;
            let drawW;
            let drawH;
            let drawX;
            let drawY;
            let rotate = (0, pdf_lib_1.degrees)(0);
            if (isLandscape) {
                const scale = Math.min(printH / image.width, printW / image.height);
                drawW = image.height * scale;
                drawH = image.width * scale;
                drawX = MARGIN_PT + (printW - drawW) / 2;
                drawY = MARGIN_PT + (printH - drawH) / 2;
                rotate = (0, pdf_lib_1.degrees)(90);
                drawX += drawW;
            }
            else {
                const scale = Math.min(printW / image.width, printH / image.height);
                drawW = image.width * scale;
                drawH = image.height * scale;
                drawX = MARGIN_PT + (printW - drawW) / 2;
                drawY = MARGIN_PT + (printH - drawH) / 2;
            }
            page.drawImage(image, {
                x: drawX,
                y: drawY,
                width: drawW,
                height: drawH,
                rotate,
            });
        });
        return page;
    }
    async addPageAsync(pdfDoc, imageBytes, mimeType, orientation) {
        const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
        page.drawRectangle({
            x: 0,
            y: 0,
            width: PAGE_WIDTH_PT,
            height: PAGE_HEIGHT_PT,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        const image = mimeType === "image/png"
            ? await pdfDoc.embedPng(imageBytes)
            : await pdfDoc.embedJpg(imageBytes);
        const isLandscape = orientation === "LANDSCAPE";
        const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
        const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;
        let drawW;
        let drawH;
        let drawX;
        let drawY;
        let rotate = (0, pdf_lib_1.degrees)(0);
        if (isLandscape) {
            const scale = Math.min(printH / image.width, printW / image.height);
            drawW = image.height * scale;
            drawH = image.width * scale;
            drawX = MARGIN_PT + (printW - drawW) / 2 + drawW;
            drawY = MARGIN_PT + (printH - drawH) / 2;
            rotate = (0, pdf_lib_1.degrees)(90);
        }
        else {
            const scale = Math.min(printW / image.width, printH / image.height);
            drawW = image.width * scale;
            drawH = image.height * scale;
            drawX = MARGIN_PT + (printW - drawW) / 2;
            drawY = MARGIN_PT + (printH - drawH) / 2;
        }
        page.drawImage(image, {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH,
            rotate,
        });
        return page;
    }
};
exports.ArtworkPageService = ArtworkPageService;
exports.ArtworkPageService = ArtworkPageService = __decorate([
    (0, common_1.Injectable)()
], ArtworkPageService);
//# sourceMappingURL=artwork-page.service.js.map