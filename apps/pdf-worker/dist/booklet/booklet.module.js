"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookletModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const booklet_processor_1 = require("./booklet.processor");
const artwork_page_service_1 = require("./pdf/artwork-page.service");
const cover_page_service_1 = require("./pdf/cover-page.service");
const pdf_builder_service_1 = require("./pdf/pdf-builder.service");
const storage_service_1 = require("./storage/storage.service");
let BookletModule = class BookletModule {
};
exports.BookletModule = BookletModule;
exports.BookletModule = BookletModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: "booklet-generation",
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 5000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                },
            }),
        ],
        providers: [
            booklet_processor_1.BookletProcessor,
            pdf_builder_service_1.PdfBuilderService,
            artwork_page_service_1.ArtworkPageService,
            cover_page_service_1.CoverPageService,
            storage_service_1.StorageService,
        ],
    })
], BookletModule);
//# sourceMappingURL=booklet.module.js.map