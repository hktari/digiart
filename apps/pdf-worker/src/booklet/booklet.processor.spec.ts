import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import type { Job } from "bullmq";
import { BookletProcessor } from "./booklet.processor";
import type { ArtworkRecord, BookletJobData } from "./booklet.types";
import { DEFAULT_PAGE_FORMAT } from "./booklet.types";
import { PdfBuilderService } from "./pdf/pdf-builder.service";
import { StorageService } from "./storage/storage.service";

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

// The worker no longer queries for artwork — the caller resolves it and puts
// it in the payload — so the only Prisma surface left is the status row.
const mockUpdate = jest.fn().mockResolvedValue({ id: "pf-1" });
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    generatedPrintFile: { update: mockUpdate },
  })),
}));

// Artwork comes through StorageService.downloadObject (signed S3 GET), not an
// unauthenticated fetch of a hand-built URL, so that is the seam.

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

const validArtwork: ArtworkRecord = {
  id: "art-1",
  title: "Test Art",
  storageKey: "art/test.jpg",
  mimeType: "image/jpeg",
  width: 2000,
  height: 2800,
  orientation: "PORTRAIT",
  creatorName: "Artist Name",
};

const jobData: BookletJobData = {
  printFileId: "pf-1",
  issueLabel: "March 2025",
  plates: [validArtwork],
};

/** Same job, different plate list. */
function withPlates(plates: ArtworkRecord[]): BookletJobData {
  return { ...jobData, plates };
}

function expectBuilt(pageCount = 2) {
  mockStorage.downloadObject.mockResolvedValue(Buffer.alloc(8));
  mockPdfBuilder.build.mockResolvedValue({
    bytes: new Uint8Array([1]),
    pageCount,
  });
  mockStorage.uploadPdf.mockResolvedValue("https://s3.example.com/x.pdf");
}

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

  it("builds a booklet from the plates in the payload", async () => {
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
      [validArtwork],
      expect.any(Map),
      "March 2025",
      ["Artist Name"],
      DEFAULT_PAGE_FORMAT,
    );
  });

  it("keys the status row by printFileId, not by collector and cycle", async () => {
    expectBuilt();

    await processor.process(makeJob(jobData));

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "pf-1" },
      data: { status: "GENERATING", errorMessage: null },
    });
    expect(mockUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: "pf-1" } }),
    );
  });

  it("throws when the payload carries no plates", async () => {
    await expect(processor.process(makeJob(withPlates([])))).rejects.toThrow(
      "Job payload carried no plates",
    );
  });

  it("prints a plate whose orientation is UNKNOWN", async () => {
    // UNKNOWN used to fail the job. layoutPlate treats anything that is not
    // LANDSCAPE as portrait, which is the right fallback, so the plate prints.
    expectBuilt();

    const result = await processor.process(
      makeJob(withPlates([{ ...validArtwork, orientation: "UNKNOWN" }])),
    );

    expect(result.skipped).toEqual([]);
  });

  it("drops an under-floor plate and prints the rest", async () => {
    expectBuilt();

    const result = await processor.process(
      makeJob(
        withPlates([
          validArtwork,
          {
            ...validArtwork,
            id: "tiny",
            storageKey: "art/tiny.jpg",
            width: 720,
            height: 405,
            orientation: "LANDSCAPE",
          },
        ]),
      ),
    );

    expect(result.skipped).toEqual([
      { id: "tiny", title: "Test Art", dpi: 96, reason: "below-floor" },
    ]);
    // The good plate still reached the builder; the bad one did not.
    const plates = mockPdfBuilder.build.mock.calls[0][0] as { id: string }[];
    expect(plates.map((p) => p.id)).toEqual(["art-1"]);
  });

  it("keeps a marginal plate but reports it", async () => {
    expectBuilt();

    const result = await processor.process(
      makeJob(
        withPlates([
          { ...validArtwork, id: "soft", width: 1131, height: 1685 },
        ]),
      ),
    );

    expect(result.skipped).toEqual([]);
    expect(result.marginal).toEqual(["soft"]);
  });

  it("reports a plate with no measured dimensions as unmeasurable", async () => {
    expectBuilt();

    const result = await processor.process(
      makeJob(
        withPlates([
          validArtwork,
          { ...validArtwork, id: "nodims", width: null, height: null },
        ]),
      ),
    );

    expect(result.skipped).toEqual([
      { id: "nodims", title: "Test Art", dpi: 0, reason: "unmeasurable" },
    ]);
  });

  it("fails the job only when nothing survives grading", async () => {
    await expect(
      processor.process(
        makeJob(withPlates([{ ...validArtwork, width: 500, height: 600 }])),
      ),
    ).rejects.toThrow(/No plates met the print floor/);
  });

  it("throws when artwork download fails", async () => {
    mockStorage.downloadObject.mockRejectedValue(new Error("NoSuchKey"));

    await expect(processor.process(makeJob(jobData))).rejects.toThrow(
      "Failed to download artwork",
    );
  });

  it("credits each artist once, and only those actually in the book", async () => {
    expectBuilt();

    await processor.process(
      makeJob(
        withPlates([
          validArtwork,
          { ...validArtwork, id: "art-2", storageKey: "art/2.jpg" },
          // Dropped: its artist must not appear on the cover of a book they
          // are not inside.
          {
            ...validArtwork,
            id: "art-3",
            storageKey: "art/3.jpg",
            width: 500,
            height: 600,
            creatorName: "Dropped Artist",
          },
        ]),
      ),
    );

    const creatorNames = mockPdfBuilder.build.mock.calls[0][3] as string[];
    expect(creatorNames).toEqual(["Artist Name"]);
  });
});
