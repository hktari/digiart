import { mkdir, writeFile } from "node:fs/promises";
import { Test, TestingModule } from "@nestjs/testing";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { StorageService } from "./storage.service";

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const MockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const MockPutObjectCommand = PutObjectCommand as jest.MockedClass<
  typeof PutObjectCommand
>;

describe("StorageService", () => {
  let service: StorageService;

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.STORAGE_DRIVER;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.STORAGE_LOCAL_PATH;
  });

  async function build(): Promise<StorageService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();
    return module.get<StorageService>(StorageService);
  }

  describe("local driver", () => {
    beforeEach(() => {
      process.env.STORAGE_DRIVER = "local";
      process.env.STORAGE_LOCAL_PATH = "/tmp/test-booklets";
    });

    it("should write PDF file locally and return a file:// URL", async () => {
      service = await build();
      const bytes = new Uint8Array([1, 2, 3]);
      const url = await service.uploadPdf(bytes);

      expect(url).toMatch(/^file:\/\/.*\.pdf$/);
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining("booklets"),
        { recursive: true },
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.pdf$/),
        bytes,
      );
    });

    it("should use default /tmp/booklets when STORAGE_LOCAL_PATH is not set", async () => {
      delete process.env.STORAGE_LOCAL_PATH;
      service = await build();
      await service.uploadPdf(new Uint8Array([1]));

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining("/tmp/booklets"),
        expect.anything(),
      );
    });
  });

  describe("s3 driver", () => {
    beforeEach(() => {
      process.env.STORAGE_DRIVER = "s3";
      process.env.AWS_REGION = "eu-west-1";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
      process.env.AWS_S3_BUCKET = "test-bucket";
    });

    it("should upload to S3 and return an https:// URL", async () => {
      service = await build();
      const mockSend = jest.fn().mockResolvedValue({});
      MockS3Client.mockImplementation(
        () => ({ send: mockSend }) as unknown as S3Client,
      );

      const bytes = new Uint8Array([1, 2, 3]);
      const url = await service.uploadPdf(bytes);

      expect(url).toMatch(
        /^https:\/\/test-bucket\.s3\.eu-west-1\.amazonaws\.com\/booklets\/.+\.pdf$/,
      );
      expect(MockPutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          ContentType: "application/pdf",
        }),
      );
    });

    it("should throw when S3 env vars are missing", async () => {
      delete process.env.AWS_REGION;
      service = await build();

      await expect(service.uploadPdf(new Uint8Array([1]))).rejects.toThrow(
        "Missing S3 env vars",
      );
    });

    it("should use custom endpoint when AWS_ENDPOINT_URL is set", async () => {
      process.env.AWS_ENDPOINT_URL = "http://localhost:9000";
      service = await build();
      const mockSend = jest.fn().mockResolvedValue({});
      MockS3Client.mockImplementation(
        () => ({ send: mockSend }) as unknown as S3Client,
      );

      await service.uploadPdf(new Uint8Array([1]));

      expect(MockS3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "http://localhost:9000",
          forcePathStyle: true,
        }),
      );

      delete process.env.AWS_ENDPOINT_URL;
    });

    it("should return path-style URL when AWS_ENDPOINT_URL is set (Railway S3/MinIO)", async () => {
      process.env.AWS_ENDPOINT_URL = "https://digiart-storage.ams.railway.app";
      service = await build();
      const mockSend = jest.fn().mockResolvedValue({});
      MockS3Client.mockImplementation(
        () => ({ send: mockSend }) as unknown as S3Client,
      );

      const bytes = new Uint8Array([1, 2, 3]);
      const url = await service.uploadPdf(bytes);

      // Should use path-style URL for Railway S3: endpoint/bucket/key
      expect(url).toMatch(
        /^https:\/\/digiart-storage\.ams\.railway\.app\/test-bucket\/booklets\/.+\.pdf$/,
      );

      delete process.env.AWS_ENDPOINT_URL;
    });
  });
});
