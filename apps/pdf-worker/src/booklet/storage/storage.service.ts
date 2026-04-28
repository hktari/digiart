import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: "local" | "s3";

  constructor() {
    this.driver = (process.env.STORAGE_DRIVER as "local" | "s3") ?? "local";
  }

  async uploadPdf(bytes: Uint8Array): Promise<string> {
    const key = `booklets/${randomUUID()}.pdf`;

    if (this.driver === "s3") {
      return this.uploadToS3(bytes, key);
    }

    return this.writeLocally(bytes, key);
  }

  private async uploadToS3(bytes: Uint8Array, key: string): Promise<string> {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucket = process.env.AWS_S3_BUCKET;

    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "Missing S3 env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET",
      );
    }

    const endpoint = process.env.AWS_ENDPOINT_URL;
    const s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint && { endpoint, forcePathStyle: true }),
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: "application/pdf",
      }),
    );

    const url = this.getPublicStorageUrl(bucket, region, key);
    this.logger.log(`PDF uploaded to S3: ${url}`);
    return url;
  }

  private async writeLocally(bytes: Uint8Array, key: string): Promise<string> {
    const basePath = process.env.STORAGE_LOCAL_PATH ?? "/tmp/booklets";
    const dir = join(basePath, "booklets");
    await mkdir(dir, { recursive: true });
    const filename = key.replace("booklets/", "");
    const filePath = join(dir, filename);
    await writeFile(filePath, bytes);
    const url = `file://${filePath}`;
    this.logger.log(`PDF written locally: ${url}`);
    return url;
  }

  private getPublicStorageUrl(
    bucket: string,
    region: string,
    key: string,
  ): string {
    const endpoint = process.env.AWS_ENDPOINT_URL;
    if (endpoint) {
      // Railway S3 / MinIO - use path-style URL
      return `${endpoint}/${bucket}/${key}`;
    }
    // AWS S3 - use virtual-hosted style
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
