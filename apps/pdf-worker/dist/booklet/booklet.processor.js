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
var BookletProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookletProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const pdf_builder_service_1 = require("./pdf/pdf-builder.service");
const storage_service_1 = require("./storage/storage.service");
const MIN_WIDTH_PX = 1240;
const MIN_HEIGHT_PX = 1748;
let BookletProcessor = BookletProcessor_1 = class BookletProcessor extends bullmq_1.WorkerHost {
    constructor(pdfBuilder, storage) {
        super();
        this.pdfBuilder = pdfBuilder;
        this.storage = storage;
        this.logger = new common_1.Logger(BookletProcessor_1.name);
        this.prisma = new client_1.PrismaClient({
            adapter: new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL }),
        });
    }
    async process(job) {
        var _a;
        const { collectorProfileId, cycleId, issueLabel } = job.data;
        this.logger.log(`Processing booklet job ${job.id} for collector=${collectorProfileId} cycle=${cycleId}`);
        const selections = await this.prisma.collectorReleaseSelection.findMany({
            where: { collectorProfileId, cycleId },
            include: {
                release: {
                    include: {
                        artworks: {
                            include: { artwork: true },
                            orderBy: { sortOrder: "asc" },
                        },
                        creatorProfile: { select: { displayName: true } },
                    },
                },
            },
        });
        const artworks = selections.flatMap((sel) => sel.release.artworks.map((ra) => ra.artwork));
        if (artworks.length === 0) {
            throw new Error("No artworks found for this collector/cycle combination");
        }
        for (const artwork of artworks) {
            if (!artwork.width ||
                !artwork.height ||
                artwork.orientation === "UNKNOWN" ||
                artwork.width < MIN_WIDTH_PX ||
                artwork.height < MIN_HEIGHT_PX) {
                throw new Error(`Artwork "${artwork.title}" (${artwork.id}) failed validation: orientation=${artwork.orientation}, dims=${artwork.width}×${artwork.height}`);
            }
        }
        const imageBuffers = new Map();
        for (const artwork of artworks) {
            const storageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${(_a = process.env.AWS_REGION) !== null && _a !== void 0 ? _a : "eu-west-1"}.amazonaws.com/${artwork.storageKey}`;
            const res = await fetch(storageUrl);
            if (!res.ok) {
                throw new Error(`Failed to download artwork ${artwork.id} from ${storageUrl}: ${res.status}`);
            }
            const arrayBuf = await res.arrayBuffer();
            imageBuffers.set(artwork.id, Buffer.from(arrayBuf));
        }
        const creatorNames = [
            ...new Set(selections.map((s) => s.release.creatorProfile.displayName)),
        ];
        const { bytes, pageCount } = await this.pdfBuilder.build(artworks, imageBuffers, issueLabel, creatorNames);
        const pdfUrl = await this.storage.uploadPdf(bytes);
        this.logger.log(`Booklet job ${job.id} complete: ${pageCount} pages → ${pdfUrl}`);
        return { pdfUrl, pageCount };
    }
};
exports.BookletProcessor = BookletProcessor;
exports.BookletProcessor = BookletProcessor = BookletProcessor_1 = __decorate([
    (0, bullmq_1.Processor)("booklet-generation"),
    __metadata("design:paramtypes", [pdf_builder_service_1.PdfBuilderService,
        storage_service_1.StorageService])
], BookletProcessor);
//# sourceMappingURL=booklet.processor.js.map