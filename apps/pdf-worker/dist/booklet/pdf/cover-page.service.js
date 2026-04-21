"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CoverPageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoverPageService = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const pdf_lib_1 = require("pdf-lib");
const PAGE_WIDTH_PT = 419.53;
const PAGE_HEIGHT_PT = 595.28;
const BEIGE_50 = (0, pdf_lib_1.rgb)(0.98, 0.973, 0.957);
const FUCHSIA_600 = (0, pdf_lib_1.rgb)(0.753, 0.149, 0.827);
const FUCHSIA_700 = (0, pdf_lib_1.rgb)(0.635, 0.11, 0.686);
const WHITE = (0, pdf_lib_1.rgb)(1, 1, 1);
let CoverPageService = CoverPageService_1 = class CoverPageService {
    constructor() {
        this.logger = new common_1.Logger(CoverPageService_1.name);
    }
    async addFrontCover(pdfDoc, font, issueLabel, creatorNames) {
        const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
        page.drawRectangle({
            x: 0,
            y: 0,
            width: PAGE_WIDTH_PT,
            height: PAGE_HEIGHT_PT,
            color: BEIGE_50,
        });
        try {
            const logoPath = (0, node_path_1.join)(process.cwd(), "../../apps/landing/public/logo.png");
            const logoBytes = await (0, promises_1.readFile)(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);
            const logoMaxW = PAGE_WIDTH_PT * 0.4;
            const scale = logoMaxW / logoImage.width;
            const logoW = logoImage.width * scale;
            const logoH = logoImage.height * scale;
            const logoX = (PAGE_WIDTH_PT - logoW) / 2;
            const logoY = PAGE_HEIGHT_PT * 0.62;
            page.drawImage(logoImage, {
                x: logoX,
                y: logoY,
                width: logoW,
                height: logoH,
            });
        }
        catch (_a) {
            this.logger.warn("Logo not found, skipping logo on front cover");
        }
        const issueFontSize = 14;
        const issueTextW = font.widthOfTextAtSize(issueLabel, issueFontSize);
        page.drawText(issueLabel, {
            x: (PAGE_WIDTH_PT - issueTextW) / 2,
            y: PAGE_HEIGHT_PT * 0.55,
            size: issueFontSize,
            font,
            color: FUCHSIA_700,
        });
        const byline = creatorNames.length === 0
            ? "Selected Works"
            : creatorNames.length === 1
                ? creatorNames[0]
                : "Selected Works";
        const bylineFontSize = 10;
        const bylineW = font.widthOfTextAtSize(byline, bylineFontSize);
        page.drawText(byline, {
            x: (PAGE_WIDTH_PT - bylineW) / 2,
            y: PAGE_HEIGHT_PT * 0.5,
            size: bylineFontSize,
            font,
            color: (0, pdf_lib_1.rgb)(0.4, 0.4, 0.4),
        });
        return page;
    }
    async addBackCover(pdfDoc) {
        const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
        page.drawRectangle({
            x: 0,
            y: 0,
            width: PAGE_WIDTH_PT,
            height: PAGE_HEIGHT_PT,
            color: FUCHSIA_600,
        });
        try {
            const logoPath = (0, node_path_1.join)(process.cwd(), "../../apps/landing/public/logo.png");
            const logoBytes = await (0, promises_1.readFile)(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);
            const logoMaxW = PAGE_WIDTH_PT * 0.28;
            const scale = logoMaxW / logoImage.width;
            const logoW = logoImage.width * scale;
            const logoH = logoImage.height * scale;
            page.drawImage(logoImage, {
                x: (PAGE_WIDTH_PT - logoW) / 2,
                y: (PAGE_HEIGHT_PT - logoH) / 2,
                width: logoW,
                height: logoH,
                opacity: 0.9,
            });
        }
        catch (_a) {
            this.logger.warn("Logo not found, skipping logo on back cover");
        }
        void WHITE;
        return page;
    }
};
exports.CoverPageService = CoverPageService;
exports.CoverPageService = CoverPageService = CoverPageService_1 = __decorate([
    (0, common_1.Injectable)()
], CoverPageService);
//# sourceMappingURL=cover-page.service.js.map