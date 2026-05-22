import path from "node:path";
import { expect, test } from "../playwright/fixtures";

// Minimal valid PNG that is 1696×2528 px (meets print dimension requirements)
const TEST_ARTWORK_PATH = path.join(
  __dirname,
  "../playwright/test-artwork-1696x2528.png",
);

test.describe("Artwork Upload", () => {
  test("creator can access artwork upload page", async ({ page }) => {
    await page.goto("/creator/artworks/new", { waitUntil: "load" });

    await expect(
      page.getByRole("heading", { name: /upload artworks/i }),
    ).toBeVisible();
    await expect(page.getByText(/drag & drop or/i)).toBeVisible();
  });

  test("file drop zone is visible", async ({ page }) => {
    await page.goto("/creator/artworks/new", { waitUntil: "load" });

    await expect(page.getByText(/drag & drop or/i)).toBeVisible();
  });

  test("upload button appears after file is selected", async ({ page }) => {
    await page.goto("/creator/artworks/new", { waitUntil: "load" });

    // Button should not be visible initially
    await expect(
      page.getByRole("button", { name: /upload.*file/i }),
    ).not.toBeVisible();

    // Select a valid PNG file (must meet print dimension requirements)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_ARTWORK_PATH);

    // Button should now be visible
    await expect(
      page.getByRole("button", { name: /upload 1 file/i }),
    ).toBeVisible();
  });

  test("shows success state after successful upload", async ({ page }) => {
    await page.route("**/api/artworks/presign", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://s3.example.com/upload",
          pendingKey: "pending/test-123",
        }),
      });
    });

    await page.route("https://s3.example.com/upload", (route) => {
      route.fulfill({ status: 200 });
    });

    await page.route("**/api/artworks/register", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          artwork: { id: "artwork-123" },
          warnings: [],
        }),
      });
    });

    await page.goto("/creator/artworks/new", { waitUntil: "load" });

    const fileInput = page.locator('input[type="file"]');
    // Use a real valid image that meets print dimension requirements (1696×2528 px)
    await fileInput.setInputFiles(TEST_ARTWORK_PATH);

    await page.getByRole("button", { name: /upload.*file/i }).click();

    // Check for success indicators
    await expect(page.getByText(/✓ uploaded/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/1 uploaded/i)).toBeVisible();
  });

  test("rejects invalid file types client-side", async ({ page }) => {
    await page.goto("/creator/artworks/new", { waitUntil: "load" });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("fake-image-data"),
    });

    // Upload button should not appear because invalid files are filtered out
    await expect(
      page.getByRole("button", { name: /upload.*file/i }),
    ).not.toBeVisible();
  });
});
