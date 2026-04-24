import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { BookletProcessor } from "./booklet.processor";
import { PdfBuilderService } from "./pdf/pdf-builder.service";
import { StorageService } from "./storage/storage.service";
import type { BookletJobData } from "./booklet.types";

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

const mockFindMany = jest.fn();
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    collectorReleaseSelection: { findMany: mockFindMany },
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockPdfBuilder = {
  build: jest.fn(),
};

const mockStorage = {
  uploadPdf: jest.fn(),
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
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      pageCount: 4,
    });
    mockStorage.uploadPdf.mockResolvedValue("https://s3.example.com/booklets/x.pdf");

    const result = await processor.process(makeJob(jobData));

    expect(result.pdfUrl).toBe("https://s3.example.com/booklets/x.pdf");
    expect(result.pageCount).toBe(4);
    expect(mockPdfBuilder.build).toHaveBeenCalledWith(
      [validArtwork],
      expect.any(Map),
      "March 2025",
      ["Artist Name"],
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

  it("should throw when artworks have UNKNOWN orientation", async () => {
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

    await expect(processor.process(makeJob(jobData))).rejects.toThrow(
      "failed validation",
    );
  });

  it("should throw when artwork dimensions are too small", async () => {
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
      "failed validation",
    );
  });

  it("should throw when artwork download fails", async () => {
    mockFindMany.mockResolvedValue([baseSelection]);
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

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
              artwork: { ...validArtwork, id: "art-2", storageKey: "art/2.jpg" },
              sortOrder: 0,
            },
          ],
          creatorProfile: { displayName: "Same Artist" },
        },
      },
    ]);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mockPdfBuilder.build.mockResolvedValue({ bytes: new Uint8Array([1]), pageCount: 4 });
    mockStorage.uploadPdf.mockResolvedValue("https://s3.example.com/x.pdf");

    await processor.process(makeJob(jobData));

    const creatorNames = mockPdfBuilder.build.mock.calls[0][3] as string[];
    expect(creatorNames).toEqual(["Same Artist"]);
    expect(creatorNames.length).toBe(1);
  });
});
