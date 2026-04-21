import type { ArtworkRecord } from "../booklet.types";
import { ArtworkPageService } from "./artwork-page.service";
import { CoverPageService } from "./cover-page.service";
export declare class PdfBuilderService {
    private readonly artworkPageService;
    private readonly coverPageService;
    private readonly logger;
    constructor(artworkPageService: ArtworkPageService, coverPageService: CoverPageService);
    build(artworks: ArtworkRecord[], imageBuffers: Map<string, Buffer>, issueLabel: string, creatorNames: string[]): Promise<{
        bytes: Uint8Array;
        pageCount: number;
    }>;
}
//# sourceMappingURL=pdf-builder.service.d.ts.map