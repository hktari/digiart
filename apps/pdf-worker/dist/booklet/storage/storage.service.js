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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const common_1 = require("@nestjs/common");
let StorageService = StorageService_1 = class StorageService {
    constructor() {
        var _a;
        this.logger = new common_1.Logger(StorageService_1.name);
        this.driver = (_a = process.env.STORAGE_DRIVER) !== null && _a !== void 0 ? _a : "local";
    }
    async uploadPdf(bytes) {
        const key = `booklets/${(0, node_crypto_1.randomUUID)()}.pdf`;
        if (this.driver === "s3") {
            return this.uploadToS3(bytes, key);
        }
        return this.writeLocally(bytes, key);
    }
    async uploadToS3(bytes, key) {
        const region = process.env.AWS_REGION;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const bucket = process.env.AWS_S3_BUCKET;
        if (!region || !accessKeyId || !secretAccessKey || !bucket) {
            throw new Error("Missing S3 env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET");
        }
        const endpoint = process.env.AWS_ENDPOINT_URL;
        const s3 = new client_s3_1.S3Client(Object.assign({ region, credentials: { accessKeyId, secretAccessKey } }, (endpoint && { endpoint, forcePathStyle: true })));
        await s3.send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: "application/pdf",
        }));
        const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        this.logger.log(`PDF uploaded to S3: ${url}`);
        return url;
    }
    async writeLocally(bytes, key) {
        var _a;
        const basePath = (_a = process.env.STORAGE_LOCAL_PATH) !== null && _a !== void 0 ? _a : "/tmp/booklets";
        const dir = (0, node_path_1.join)(basePath, "booklets");
        await (0, promises_1.mkdir)(dir, { recursive: true });
        const filename = key.replace("booklets/", "");
        const filePath = (0, node_path_1.join)(dir, filename);
        await (0, promises_1.writeFile)(filePath, bytes);
        const url = `file://${filePath}`;
        this.logger.log(`PDF written locally: ${url}`);
        return url;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StorageService);
//# sourceMappingURL=storage.service.js.map