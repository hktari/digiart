export declare class StorageService {
    private readonly logger;
    private readonly driver;
    constructor();
    uploadPdf(bytes: Uint8Array): Promise<string>;
    private uploadToS3;
    private writeLocally;
}
//# sourceMappingURL=storage.service.d.ts.map