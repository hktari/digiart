/**
 * Queue Integration Test
 *
 * Tests the full flow: MVP enqueues a job → BullMQ Redis queue → BookletProcessor
 * picks it up → builds PDF → uploads to storage.
 *
 * Infrastructure: real Redis via testcontainers (Docker required).
 * External deps mocked: Prisma (DB) and StorageService (artwork download + PDF write).
 */

import { BullModule } from "@nestjs/bullmq";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { Queue } from "bullmq";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { BookletProcessor } from "../src/booklet/booklet.processor";
import type {
  BookletJobData,
  BookletJobResult,
} from "../src/booklet/booklet.types";
import { ArtworkPageService } from "../src/booklet/pdf/artwork-page.service";
import { CoverPageService } from "../src/booklet/pdf/cover-page.service";
import { PdfBuilderService } from "../src/booklet/pdf/pdf-builder.service";
import { PdfXProcessorService } from "../src/booklet/pdf/pdfx-processor.service";
import { StorageService } from "../src/booklet/storage/storage.service";

// ---------------------------------------------------------------------------
// Fixtures — JPEGs synthesised at run time.
//
// These were previously read from test/artworks/, which was never committed, so
// the suite only ever ran on the machine that had those files. Generating them
// keeps the bytes genuinely JPEG-encoded (sharp decodes them exactly as it would
// an S3 download) while making the suite runnable anywhere, with no binaries in
// the repo and no artwork of unclear provenance.
//
// Dimensions must clear BookletProcessor's MIN_WIDTH_PX/MIN_HEIGHT_PX and match
// the width/height on the mocked artwork rows below.
// ---------------------------------------------------------------------------
const ARTWORK_WIDTH = 1800;
const ARTWORK_HEIGHT = 2600;
const ARTWORK_FILES = [
  "artwork-portrait-01.jpg",
  "artwork-portrait-02.jpg",
  "artwork-portrait-03.jpg",
];

/** A distinct, deterministic JPEG per index, so pages are visually distinguishable. */
async function makeArtworkJpeg(index: number): Promise<Buffer> {
  const hues = [
    { r: 190, g: 90, b: 60 },
    { r: 60, g: 130, b: 170 },
    { r: 90, g: 160, b: 110 },
  ];
  return sharp({
    create: {
      width: ARTWORK_WIDTH,
      height: ARTWORK_HEIGHT,
      channels: 3,
      background: hues[index % hues.length],
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Mock Prisma — injected via jest.mock so BookletProcessor.prisma is replaced
// ---------------------------------------------------------------------------
const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    collectorReleaseSelection: { findMany: mockFindMany },
    // The processor moves the print file through GENERATING → READY/FAILED on
    // every job, including the failure path, so this must be stubbed or the
    // real error is masked by a TypeError on undefined.
    generatedPrintFile: { updateMany: mockUpdateMany },
  })),
}));

// Artwork is fetched via StorageService.downloadObject (a signed S3 GET), so
// that method is stubbed below to serve the synthesised fixtures.

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

    // 2. Synthesise the artwork images the storage stub will serve
    artworkBuffers = await Promise.all(
      ARTWORK_FILES.map((_, i) => makeArtworkJpeg(i)),
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
        creatorProfile: {
          displayName: i === 0 ? "Creator Alpha" : "Creator Beta",
        },
      },
    }));
    mockFindMany.mockResolvedValue(selections);

    // 4. (see step 5 — artwork bytes are served by stubbing StorageService)

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
        PdfXProcessorService,
        StorageService,
      ],
    }).compile();

    // Spy on StorageService.uploadPdf to capture the bytes written
    const storageService = module.get<StorageService>(StorageService);
    storageUploadSpy = jest.spyOn(storageService, "uploadPdf");

    // Serve each artwork's bytes by matching the storage key, so every page
    // gets a visibly different image. An unmatched key is a bug in the test
    // setup, not something to paper over with a fallback — it would silently
    // put artwork 1 on all three pages.
    jest
      .spyOn(storageService, "downloadObject")
      .mockImplementation(async (key: string) => {
        const index = ARTWORK_FILES.findIndex((file) => key.includes(file));
        if (index < 0)
          throw new Error(`Unexpected artwork key in test: ${key}`);
        return artworkBuffers[index];
      });

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
      // getState() can report "failed" a beat before failedReason is readable,
      // so keep polling rather than returning a placeholder that would mask the
      // real message.
      if (job.failedReason) return job.failedReason;
    }
    if (state === "completed") {
      throw new Error("Expected job to fail but it completed");
    }
    await sleep(200);
  }
  throw new Error(
    `Job ${jobId} did not fail with a readable reason within ${timeoutMs}ms`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
