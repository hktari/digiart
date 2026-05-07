import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { BookletProcessor } from "./booklet.processor";
import { ArtworkPageService } from "./pdf/artwork-page.service";
import { CoverPageService } from "./pdf/cover-page.service";
import { PdfBuilderService } from "./pdf/pdf-builder.service";
import { PdfXProcessorService } from "./pdf/pdfx-processor.service";
import { StorageService } from "./storage/storage.service";

@Module({
  imports: [
    BullModule.registerQueue({
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
    BookletProcessor,
    PdfBuilderService,
    ArtworkPageService,
    CoverPageService,
    PdfXProcessorService,
    StorageService,
  ],
})
export class BookletModule {}
