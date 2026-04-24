import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * S3 Mock utilities for integration tests.
 *
 * Instead of uploading to real S3, we store files locally
 * and serve them via file:// URLs.
 */

const DEFAULT_STORAGE_PATH = "/tmp/test-uploads";

/**
 * Get the storage path for mock S3 files
 */
export function getStoragePath(): string {
  return process.env.STORAGE_LOCAL_PATH || DEFAULT_STORAGE_PATH;
}

/**
 * Initialize the mock S3 storage directory
 */
export async function initMockS3(): Promise<void> {
  const storagePath = getStoragePath();
  await mkdir(storagePath, { recursive: true });
  await mkdir(join(storagePath, "artworks"), { recursive: true });
  await mkdir(join(storagePath, "uploads", "pending"), { recursive: true });
  await mkdir(join(storagePath, "booklets"), { recursive: true });
}

/**
 * Mock the S3 upload - saves file locally
 */
export async function mockS3Upload(
  uploadUrl: string,
  fileBuffer: Buffer,
): Promise<void> {
  // If uploadUrl is our local mock format
  if (uploadUrl.startsWith("file://")) {
    const filePath = uploadUrl.replace("file://", "");
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, fileBuffer);
    return;
  }

  // For presigned S3 URLs, we can't actually upload in tests
  // So we save to our local storage instead
  const key = extractKeyFromUrl(uploadUrl);
  const filePath = join(getStoragePath(), key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, fileBuffer);
}

/**
 * Store a file in mock S3 by key
 */
export async function mockS3File(
  key: string,
  fileBuffer: Buffer,
): Promise<string> {
  const storagePath = getStoragePath();
  const filePath = join(storagePath, key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, fileBuffer);

  // Return a URL that the PDF worker can use
  return `file://${filePath}`;
}

/**
 * Get a file from mock S3
 */
export async function getMockS3File(key: string): Promise<Buffer> {
  const filePath = join(getStoragePath(), key);
  return readFile(filePath);
}

/**
 * Generate a mock presigned URL for testing
 */
export function generateMockPresignUrl(pendingKey: string): string {
  const storagePath = getStoragePath();
  const filePath = join(storagePath, pendingKey);
  return `file://${filePath}`;
}

/**
 * Create a mock upload URL for the presign endpoint
 */
export function createMockPresignResponse(
  contentType: string,
  _fileSize: number,
) {
  const ext = contentType === "image/jpeg" ? "jpg" : "png";
  const uuid = randomUUID();
  const pendingKey = `uploads/pending/${uuid}.${ext}`;
  const uploadUrl = generateMockPresignUrl(pendingKey);

  return {
    uploadUrl,
    pendingKey,
  };
}

/**
 * Clean up all mock S3 files
 */
export async function cleanupMockS3(): Promise<void> {
  try {
    const storagePath = getStoragePath();
    // Just remove the entire directory
    const { rm } = await import("node:fs/promises");
    await rm(storagePath, { recursive: true, force: true });
    await initMockS3();
    console.log("✓ Mock S3 storage cleaned up");
  } catch (error) {
    // Ignore errors if directory doesn't exist
    console.log("Mock S3 cleanup (directory may not exist):", error);
  }
}

/**
 * Extract a storage key from an S3 URL
 */
function extractKeyFromUrl(url: string): string {
  // Handle presigned S3 URLs - extract the key from the path
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.slice(1);
  } catch {
    // If not a valid URL, return as-is
    return url;
  }
}

/**
 * Check if a mock S3 file exists
 */
export async function mockS3FileExists(key: string): Promise<boolean> {
  try {
    const filePath = join(getStoragePath(), key);
    const { access } = await import("node:fs/promises");
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
