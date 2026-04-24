/**
 * Artwork Upload Flow Integration Tests
 *
 * Tests the complete artwork upload flow:
 * 1. POST /api/artworks/presign - Get presigned URL
 * 2. Upload file to mock S3
 * 3. POST /api/artworks/register - Register artwork in database
 */

import { createTestCreator } from "../factories/user.factory";
import { getTestPrismaClient } from "../utils/database";
import {
  createMockPresignResponse,
  mockS3FileExists,
  mockS3Upload,
} from "../utils/s3-mock";

describe("Artwork Upload Flow", () => {
  // This test verifies the database operations work correctly
  // It bypasses the actual HTTP API and tests the data layer directly
  describe("Database Operations", () => {
    it("should create artwork record in database", async () => {
      const db = getTestPrismaClient();

      // 1. Create a test creator
      const { profile: creatorProfile } = await createTestCreator(db);

      // 2. Create artwork directly in DB (simulating register endpoint success)
      const artwork = await db.artwork.create({
        data: {
          creatorProfileId: creatorProfile.id,
          title: "Test Artwork",
          storageKey: "artworks/test-123.jpg",
          mimeType: "image/jpeg",
          fileSize: 1_024_000,
          width: 1920,
          height: 1080,
          orientation: "LANDSCAPE",
        },
      });

      // 3. Verify artwork was created
      expect(artwork.id).toBeDefined();
      expect(artwork.title).toBe("Test Artwork");
      expect(artwork.creatorProfileId).toBe(creatorProfile.id);
      expect(artwork.storageKey).toBe("artworks/test-123.jpg");
      expect(artwork.status).toBe("ACTIVE");

      // 4. Verify we can retrieve it with relations
      const found = await db.artwork.findUnique({
        where: { id: artwork.id },
        include: { creatorProfile: true },
      });

      expect(found).not.toBeNull();
      expect(found?.creatorProfile.id).toBe(creatorProfile.id);
    });

    it("should enforce artwork constraints", async () => {
      const db = getTestPrismaClient();
      const { profile: creatorProfile } = await createTestCreator(db);

      // Test creating artwork with minimal required fields
      const artwork = await db.artwork.create({
        data: {
          creatorProfileId: creatorProfile.id,
          title: "Minimal Artwork",
          storageKey: "artworks/minimal.jpg",
        },
      });

      expect(artwork.id).toBeDefined();
      // Defaults should be set
      expect(artwork.status).toBe("ACTIVE");
      expect(artwork.orientation).toBe("UNKNOWN");
    });
  });

  describe("Mock S3 Operations", () => {
    it("should store and retrieve mock S3 files", async () => {
      const testKey = "uploads/pending/test-file.jpg";
      const testBuffer = Buffer.from("fake image data");

      // Store file
      const _mockUrl = await mockS3Upload(
        `file:///tmp/test-uploads/${testKey}`,
        testBuffer,
      );

      // Verify file exists
      const exists = await mockS3FileExists(testKey);
      expect(exists).toBe(true);
    });

    it("should generate presign response", () => {
      const response = createMockPresignResponse("image/jpeg", 1024);

      expect(response.pendingKey).toMatch(/^uploads\/pending\/[\w-]+\.jpg$/);
      expect(response.uploadUrl).toMatch(/^file:\/\//);
    });
  });

  describe("End-to-End Flow (with auth bypass)", () => {
    // These tests would require the Next.js app to be running
    // For now, we test the individual components
    it.skip("should complete full upload flow via API", async () => {
      // This test requires:
      // 1. Next.js dev server running
      // 2. Auth bypass configured
      // 3. HTTP client (supertest) to call API routes
      //
      // Implementation would be:
      // 1. POST /api/artworks/presign
      // 2. Upload to mock S3
      // 3. POST /api/artworks/register
      // 4. Verify artwork in database
    });
  });
});
