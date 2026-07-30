import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: "local" | "s3";
  private s3Client: S3Client | null = null;

  constructor() {
    this.driver = (process.env.STORAGE_DRIVER as "local" | "s3") ?? "local";
  }

  /**
   * Reads a stored object's bytes.
   *
   * Through the S3 client rather than fetching a constructed URL: the bucket
   * is private (mvp serves every object via presigned URLs), and in production
   * the storage is not AWS at all — AWS_ENDPOINT_URL points at Tigris, so the
   * virtual-hosted `<bucket>.s3.<region>.amazonaws.com` host does not even
   * resolve. Signing with the credentials the worker already holds sidesteps
   * both problems.
   */
  async downloadObject(key: string): Promise<Buffer> {
    const { bucket } = this.requireS3Config();
    const response = await this.getS3Client().send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error(`Storage object ${key} returned no body`);
    }
    return Buffer.from(await response.Body.transformToByteArray());
  }

  private requireS3Config() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucket = process.env.AWS_S3_BUCKET;

    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "Missing S3 env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET",
      );
    }
    return { region, accessKeyId, secretAccessKey, bucket };
  }

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      const { region, accessKeyId, secretAccessKey } = this.requireS3Config();
      const endpoint = process.env.AWS_ENDPOINT_URL;
      this.s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
        ...(endpoint && { endpoint, forcePathStyle: true }),
      });
    }
    return this.s3Client;
  }

  async uploadPdf(bytes: Uint8Array): Promise<string> {
    const key = `booklets/${randomUUID()}.pdf`;

    if (this.driver === "s3") {
      return this.uploadToS3(bytes, key);
    }

    return this.writeLocally(bytes, key);
  }

  private async uploadToS3(bytes: Uint8Array, key: string): Promise<string> {
    const { region, bucket } = this.requireS3Config();

    await this.getS3Client().send(
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
