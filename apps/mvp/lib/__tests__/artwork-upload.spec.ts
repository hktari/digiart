import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateArtworkFile } from "../artwork-upload";

function makeFile(type: string, sizeBytes: number): File {
  const buf = new Uint8Array(sizeBytes);
  return new File([buf], "test.jpg", { type });
}

function mockImageDimensions(width: number, height: number) {
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = width;
      naturalHeight = height;
      onload: (() => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    },
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("validateArtworkFile", () => {
  it("rejects unsupported format", async () => {
    const file = makeFile("image/webp", 1000);
    const result = await validateArtworkFile(file, "blob:test");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toMatch(/only jpeg and png/i);
  });

  it("rejects files over 50 MB", async () => {
    const file = makeFile("image/jpeg", 51 * 1024 * 1024);
    const result = await validateArtworkFile(file, "blob:test");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toMatch(/50 mb/i);
  });

  it("rejects portrait image below minimum resolution", async () => {
    mockImageDimensions(800, 1200);
    const file = makeFile("image/jpeg", 1000);
    const result = await validateArtworkFile(file, "blob:test");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toMatch(/too small/i);
  });

  it("accepts valid portrait image (1748×2480)", async () => {
    mockImageDimensions(1748, 2480);
    const file = makeFile("image/jpeg", 1000);
    const result = await validateArtworkFile(file, "blob:test");
    expect(result.valid).toBe(true);
  });

  it("accepts valid landscape image (2480×1748)", async () => {
    mockImageDimensions(2480, 1748);
    const file = makeFile("image/jpeg", 1000);
    const result = await validateArtworkFile(file, "blob:test");
    expect(result.valid).toBe(true);
  });

  it("accepts PNG format", async () => {
    mockImageDimensions(2000, 3000);
    const file = makeFile("image/png", 1000);
    const result = await validateArtworkFile(file, "blob:test");
    expect(result.valid).toBe(true);
  });

  it("returns error when image dimensions cannot be read", async () => {
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 0;
        naturalHeight = 0;
        onload: (() => void) | null = null;
        onerror: ((e: Event) => void) | null = null;
        set src(_: string) {
          setTimeout(() => this.onerror?.(new Event("error")), 0);
        }
      },
    );
    const file = makeFile("image/jpeg", 1000);
    const result = await validateArtworkFile(file, "blob:test");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toMatch(/dimensions/i);
  });
});
