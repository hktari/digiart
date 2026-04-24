/**
 * Queue Integration Test
 *
 * Tests the full flow: MVP enqueues a job → BullMQ Redis queue → BookletProcessor
 * picks it up → builds PDF → uploads to storage.
 *
 * Infrastructure: real Redis via testcontainers (Docker required).
 * External deps mocked: Prisma (DB), fetch (S3 artwork download), StorageService (local write).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Test, TestingModule } from "@nestjs/testing";
import { BullModule, getQueueToken } from "@nestjs/bullmq";
import { Queue, Worker } from "bullmq";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import { PDFDocument } from "pdf-lib";
import { BookletProcessor } from "../src/booklet/booklet.processor";
import { PdfBuilderService } from "../src/booklet/pdf/pdf-builder.service";
import { ArtworkPageService } from "../src/booklet/pdf/artwork-page.service";
import { CoverPageService } from "../src/booklet/pdf/cover-page.service";
import { StorageService } from "../src/booklet/storage/storage.service";
import type { BookletJobData, BookletJobResult } from "../src/booklet/booklet.types";

// ---------------------------------------------------------------------------
// Fixtures — real JPEG files from test/artworks/
// ---------------------------------------------------------------------------
const ARTWORKS_DIR = join(__dirname, "artworks");
const ARTWORK_FILES = [
  "00027-flux_dev.jpeg",
  "00059-234188524.jpg",
  "DW2C74B5Q1P1MPYGS27DDYZES0.jpeg",
];

// ---------------------------------------------------------------------------
// Mock Prisma — injected via jest.mock so BookletProcessor.prisma is replaced
// ---------------------------------------------------------------------------
const mockFindMany = jest.fn();
jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    collectorReleaseSelection: { findMany: mockFindMany },
  })),
}));

// ---------------------------------------------------------------------------
// Mock fetch — serves artwork bytes from disk (simulating S3)
// ---------------------------------------------------------------------------
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------
const QUEUE_NAME = "booklet-generation";
const COLLECTOR_ID = "col-integration-test";
const CYCLE_ID = "cycle-integration-test";
const ISSUE_LABEL = "Integration April 2025";

describe("Queue Integration: MVP enqueue → BookletProcessor → Storage", () => {
  let redisContainer: StartedRedisContainer;
  let redisUrl: string;

  // Shared NestJS module & processor
  let module: TestingModule;
  let storageUploadSpy: jest.SpyInstance;

  // BullMQ producer (simulates MVP)
  let producerQueue: Queue<BookletJobData>;

  // Artwork buffers loaded from disk
  let artworkBuffers: Buffer[];

  beforeAll(async () => {
    // 1. Start Redis container
    redisContainer = await new RedisContainer("redis:7-alpine").start();
    redisUrl = redisContainer.getConnectionUrl();

    // 2. Load real artwork images for the mock HTTP responses
    artworkBuffers = await Promise.all(
      ARTWORK_FILES.map((f) => readFile(join(ARTWORKS_DIR, f))),
    );

    // 3. Configure mock Prisma to return 3 artwork selections
    const selections = ARTWORK_FILES.map((file, i) => ({
      release: {
        artworks: [
          {
            artwork: {
              id: `artwork-${i}`,
              title: `Test Artwork ${i + 1}`,
              storageKey: `test/${file}`,
              mimeType: file.endsWith(".png") ? "image/png" : "image/jpeg",
              width: 1800,
              height: 2600,
              orientation: "PORTRAIT",
            },
            sortOrder: i,
          },
        ],
        creatorProfile: { displayName: i === 0 ? "Creator Alpha" : "Creator Beta" },
      },
    }));
    mockFindMany.mockResolvedValue(selections);

    // 4. Configure mock fetch to return artwork bytes from disk
    mockFetch.mockImplementation(async (url: string) => {
      const idx = ARTWORK_FILES.findIndex((f) => url.includes(f) || url.includes(`artwork-${ARTWORK_FILES.indexOf(f)}`));
      // Fall back: match by artwork index in URL order
      const matched = ARTWORK_FILES.findIndex((_, i) => url.includes(`artwork-${i}`));
      const bufIdx = matched >= 0 ? matched : 0;
      return {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(
          artworkBuffers[bufIdx].buffer.slice(
            artworkBuffers[bufIdx].byteOffset,
            artworkBuffers[bufIdx].byteOffset + artworkBuffers[bufIdx].byteLength,
          ),
        ),
      };
    });

    // 5. Build NestJS module with real BookletModule services, wired to the test Redis
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.STORAGE_DRIVER = "local";
    process.env.STORAGE_LOCAL_PATH = "/tmp/pdf-worker-test";
    process.env.AWS_S3_BUCKET = "test-bucket";
    process.env.AWS_REGION = "eu-west-1";
    process.env.REDIS_URL = redisUrl;

    module = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ connection: { url: redisUrl } }),
        BullModule.registerQueue({ name: QUEUE_NAME }),
      ],
      providers: [
        BookletProcessor,
        PdfBuilderService,
        ArtworkPageService,
        CoverPageService,
        StorageService,
      ],
    }).compile();

    // Spy on StorageService.uploadPdf to capture the bytes written
    const storageService = module.get<StorageService>(StorageService);
    storageUploadSpy = jest.spyOn(storageService, "uploadPdf");

    await module.init();

    // 6. Create producer queue (simulates apps/mvp API route)
    producerQueue = new Queue<BookletJobData>(QUEUE_NAME, {
      connection: { url: redisUrl },
    });
  }, 60_000);

  afterAll(async () => {
    await producerQueue?.close();
    await module?.close();
    await redisContainer?.stop();
  });

  it("should process a booklet job end-to-end: queue → worker → PDF → storage", async () => {
    const jobData: BookletJobData = {
      collectorProfileId: COLLECTOR_ID,
      cycleId: CYCLE_ID,
      issueLabel: ISSUE_LABEL,
    };

    // Enqueue the job (exactly as MVP route does)
    const job = await producerQueue.add("generate", jobData, {
      jobId: `booklet-${COLLECTOR_ID}-${CYCLE_ID}`,
    });

    expect(job.id).toBeDefined();

    // Wait for the worker to complete the job (poll job state)
    const result = await waitForJobCompletion<BookletJobResult>(
      producerQueue,
      job.id!,
      30_000,
    );

    // Assert result shape
    expect(result).toBeDefined();
    expect(result.pdfUrl).toMatch(/^file:\/\//);
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.pageCount % 2).toBe(0);

    // Assert storage was called with valid PDF bytes
    expect(storageUploadSpy).toHaveBeenCalledTimes(1);
    const uploadedBytes = storageUploadSpy.mock.calls[0][0] as Uint8Array;
    expect(uploadedBytes).toBeInstanceOf(Uint8Array);
    expect(uploadedBytes.length).toBeGreaterThan(1000);

    // Assert the bytes are a valid PDF
    const pdfDoc = await PDFDocument.load(uploadedBytes);
    expect(pdfDoc.getPageCount()).toBe(result.pageCount);
    // front cover + 3 artwork pages + back cover = 5 → padded to 6
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(4);

    console.log(
      `✓ Integration: job=${job.id}, pages=${result.pageCount}, url=${result.pdfUrl}`,
    );
  }, 45_000);

  it("should fail a job with a descriptive error when no artworks exist", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        release: {
          artworks: [],
          creatorProfile: { displayName: "Empty Creator" },
        },
      },
    ]);

    const emptyJob = await producerQueue.add(
      "generate",
      {
        collectorProfileId: "col-empty",
        cycleId: "cycle-empty",
        issueLabel: "Empty Issue",
      },
      { jobId: `booklet-col-empty-cycle-empty-${Date.now()}` },
    );

    const error = await waitForJobFailure(producerQueue, emptyJob.id!, 15_000);
    expect(error).toMatch(/No artworks found/);

    console.log(`✓ Integration failure: job=${emptyJob.id}, error="${error}"`);
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForJobCompletion<T>(
  queue: Queue,
  jobId: string,
  timeoutMs: number,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const state = await job.getState();
    if (state === "completed") {
      return job.returnvalue as T;
    }
    if (state === "failed") {
      throw new Error(`Job failed: ${job.failedReason}`);
    }
    await sleep(200);
  }
  throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
}

async function waitForJobFailure(
  queue: Queue,
  jobId: string,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const state = await job.getState();
    if (state === "failed") {
      return job.failedReason ?? "unknown error";
    }
    if (state === "completed") {
      throw new Error("Expected job to fail but it completed");
    }
    await sleep(200);
  }
  throw new Error(`Job ${jobId} did not fail within ${timeoutMs}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
