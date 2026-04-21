import { WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import type { BookletJobData, BookletJobResult } from "./booklet.types";
import { PdfBuilderService } from "./pdf/pdf-builder.service";
import { StorageService } from "./storage/storage.service";
export declare class BookletProcessor extends WorkerHost {
    private readonly pdfBuilder;
    private readonly storage;
    private readonly logger;
    private readonly prisma;
    constructor(pdfBuilder: PdfBuilderService, storage: StorageService);
    process(job: Job<BookletJobData>): Promise<BookletJobResult>;
}
//# sourceMappingURL=booklet.processor.d.ts.map