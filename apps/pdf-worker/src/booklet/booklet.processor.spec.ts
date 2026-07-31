import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import type { Job } from "bullmq";
import { BookletProcessor } from "./booklet.processor";
import type { BookletJobData } from "./booklet.types";
import { DEFAULT_PAGE_FORMAT } from "./booklet.types";
import { PdfBuilderService } from "./pdf/pdf-builder.service";
import { StorageService } from "./storage/storage.service";

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    collectorReleaseSelection: { findMany: mockFindMany },
    generatedPrintFile: { updateMany: mockUpdateMany },
  })),
}));

// Artwork now comes through StorageService.downloadObject (signed S3 GET),
// not an unauthenticated fetch of a hand-built URL, so that is the seam.

const mockPdfBuilder = {
  build: jest.fn(),
};

const mockStorage = {
  uploadPdf: jest.fn(),
  downloadObject: jest.fn(),
};

function makeJob(data: BookletJobData): Job<BookletJobData> {
  return { id: "job-1", data } as unknown as Job<BookletJobData>;
}

const validArtwork = {
  id: "art-1",
  title: "Test Art",
  storageKey: "art/test.jpg",
  mimeType: "image/jpeg",
  width: 2000,
  height: 2800,
  orientation: "PORTRAIT",
};

const baseSelection = {
  release: {
    artworks: [{ artwork: validArtwork, sortOrder: 0 }],
    creatorProfile: { displayName: "Artist Name" },
  },
};

const jobData: BookletJobData = {
  collectorProfileId: "col-1",
  cycleId: "cycle-1",
  issueLabel: "March 2025",
};

describe("BookletProcessor", () => {
  let processor: BookletProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://test";
    process.env.AWS_S3_BUCKET = "test-bucket";
    process.env.AWS_REGION = "eu-west-1";

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookletProcessor,
        { provide: PdfBuilderService, useValue: mockPdfBuilder },
        { provide: StorageService, useValue: mockStorage },
      ],
    })
      .overrideProvider(getQueueToken("booklet-generation"))
      .useValue({})
      .compile();

    processor = module.get<BookletProcessor>(BookletProcessor);
  });

  it("should process a booklet job successfully", async () => {
    mockFindMany.mockResolvedValue([baseSelection]);
    mockStorage.downloadObject.mockResolvedValue(Buffer.alloc(8));
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      pageCount: 4,
    });
    mockStorage.uploadPdf.mockResolvedValue(
      "https://s3.example.com/booklets/x.pdf",
    );

    const result = await processor.process(makeJob(jobData));

    expect(result.pdfUrl).toBe("https://s3.example.com/booklets/x.pdf");
    expect(result.pageCount).toBe(4);
    expect(mockPdfBuilder.build).toHaveBeenCalledWith(
      // The release's creator is stamped onto each piece so the builder can
      // credit individual plates, not just the cover.
      [{ ...validArtwork, creatorName: "Artist Name" }],
      expect.any(Map),
      "March 2025",
      ["Artist Name"],
      DEFAULT_PAGE_FORMAT,
    );
  });

  it("should throw when no artworks are found", async () => {
    mockFindMany.mockResolvedValue([
      {
        release: {
          artworks: [],
          creatorProfile: { displayName: "Artist" },
        },
      },
    ]);

    await expect(processor.process(makeJob(jobData))).rejects.toThrow(
      "No artworks found for this collector/cycle combination",
    );
  });

  it("prints a plate whose orientation is UNKNOWN", async () => {
    // UNKNOWN used to fail the job. layoutPlate treats anything that is not
    // LANDSCAPE as portrait, which is the right fallback, so the plate prints.
    mockFindMany.mockResolvedValue([
      {
        release: {
          artworks: [
            {
              artwork: { ...validArtwork, orientation: "UNKNOWN" },
              sortOrder: 0,
            },
          ],
          creatorProfile: { displayName: "Artist" },
        },
      },
    ]);
    mockStorage.downloadObject.mockResolvedValue(Buffer.alloc(8));
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1]),
      pageCount: 2,
    });
    mockStorage.uploadPdf.mockResolvedValue("https://s3.example.com/x.pdf");

    const result = await processor.process(makeJob(jobData));

    expect(result.skipped).toEqual([]);
  });

  it("drops an under-floor plate and prints the rest", async () => {
    mockFindMany.mockResolvedValue([
      {
        release: {
          artworks: [
            { artwork: validArtwork, sortOrder: 0 },
            {
              artwork: {
                ...validArtwork,
                id: "tiny",
                storageKey: "art/tiny.jpg",
                width: 720,
                height: 405,
                orientation: "LANDSCAPE",
              },
              sortOrder: 1,
            },
          ],
          creatorProfile: { displayName: "Artist" },
        },
      },
    ]);
    mockStorage.downloadObject.mockResolvedValue(Buffer.alloc(8));
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1]),
      pageCount: 2,
    });
    mockStorage.uploadPdf.mockResolvedValue("https://s3.example.com/x.pdf");

    const result = await processor.process(makeJob(jobData));

    expect(result.skipped).toEqual([
      { id: "tiny", title: "Test Art", dpi: 96, reason: "below-floor" },
    ]);
    // The good plate still reached the builder; the bad one did not.
    const plates = mockPdfBuilder.build.mock.calls[0][0] as { id: string }[];
    expect(plates.map((p) => p.id)).toEqual(["art-1"]);
  });

  it("keeps a marginal plate but reports it", async () => {
    mockFindMany.mockResolvedValue([
      {
        release: {
          artworks: [
            {
              artwork: {
                ...validArtwork,
                id: "soft",
                width: 1131,
                height: 1685,
              },
              sortOrder: 0,
            },
          ],
          creatorProfile: { displayName: "Artist" },
        },
      },
    ]);
    mockStorage.downloadObject.mockResolvedValue(Buffer.alloc(8));
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1]),
      pageCount: 2,
    });
    mockStorage.uploadPdf.mockResolvedValue("https://s3.example.com/x.pdf");

    const result = await processor.process(makeJob(jobData));

    expect(result.skipped).toEqual([]);
    expect(result.marginal).toEqual(["soft"]);
  });

  it("reports a plate with no measured dimensions as unmeasurable", async () => {
    mockFindMany.mockResolvedValue([
      {
        release: {
          artworks: [
            { artwork: validArtwork, sortOrder: 0 },
            {
              artwork: {
                ...validArtwork,
                id: "nodims",
                width: null,
                height: null,
              },
              sortOrder: 1,
            },
          ],
          creatorProfile: { displayName: "Artist" },
        },
      },
    ]);
    mockStorage.downloadObject.mockResolvedValue(Buffer.alloc(8));
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1]),
      pageCount: 2,
    });
    mockStorage.uploadPdf.mockResolvedValue("https://s3.example.com/x.pdf");

    const result = await processor.process(makeJob(jobData));

    expect(result.skipped).toEqual([
      { id: "nodims", title: "Test Art", dpi: 0, reason: "unmeasurable" },
    ]);
  });

  it("fails the job only when nothing survives grading", async () => {
    mockFindMany.mockResolvedValue([
      {
        release: {
          artworks: [
            {
              artwork: { ...validArtwork, width: 500, height: 600 },
              sortOrder: 0,
            },
          ],
          creatorProfile: { displayName: "Artist" },
        },
      },
    ]);

    await expect(processor.process(makeJob(jobData))).rejects.toThrow(
      /No plates met the print floor/,
    );
  });

  it("should throw when artwork download fails", async () => {
    mockFindMany.mockResolvedValue([baseSelection]);
    mockStorage.downloadObject.mockRejectedValue(new Error("NoSuchKey"));

    await expect(processor.process(makeJob(jobData))).rejects.toThrow(
      "Failed to download artwork",
    );
  });

  it("should deduplicate creator names", async () => {
    mockFindMany.mockResolvedValue([
      {
        release: {
          artworks: [{ artwork: validArtwork, sortOrder: 0 }],
          creatorProfile: { displayName: "Same Artist" },
        },
      },
      {
        release: {
          artworks: [
            {
              artwork: {
                ...validArtwork,
                id: "art-2",
                storageKey: "art/2.jpg",
              },
              sortOrder: 0,
            },
          ],
          creatorProfile: { displayName: "Same Artist" },
        },
      },
    ]);
    mockStorage.downloadObject.mockResolvedValue(Buffer.alloc(8));
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1]),
      pageCount: 4,
    });
    mockStorage.uploadPdf.mockResolvedValue("https://s3.example.com/x.pdf");

    await processor.process(makeJob(jobData));

    const creatorNames = mockPdfBuilder.build.mock.calls[0][3] as string[];
    expect(creatorNames).toEqual(["Same Artist"]);
    expect(creatorNames.length).toBe(1);
  });
});
