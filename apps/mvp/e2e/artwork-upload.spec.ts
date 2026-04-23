import { expect, test } from "../playwright/fixtures";

test.describe("Artwork Upload", () => {
  test("creator can access artwork upload page", async ({ page }) => {
    await page.goto("/creator/artworks/new", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: /upload artwork/i }),
    ).toBeVisible();
    await expect(page.getByText(/drag & drop or/i)).toBeVisible();
  });

  test("file drop zone and title input are visible", async ({ page }) => {
    await page.goto("/creator/artworks/new", { waitUntil: "networkidle" });

    await expect(page.getByText(/drag & drop or/i)).toBeVisible();
    await expect(page.getByLabel(/title/i)).toBeVisible();
  });

  test("submit button is disabled until both file and title are filled", async ({
    page,
  }) => {
    await page.goto("/creator/artworks/new", { waitUntil: "networkidle" });

    const submitButton = page.getByRole("button", { name: /upload artwork/i });
    await expect(submitButton).toBeDisabled();

    const titleInput = page.getByLabel(/title/i);
    await titleInput.waitFor({ state: "visible" });
    await titleInput.fill("Test Artwork");
    await expect(submitButton).toBeDisabled();
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

    await page.goto("/creator/artworks/new", { waitUntil: "networkidle" });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-artwork.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-data"),
    });

    const titleInput = page.getByLabel(/title/i);
    await titleInput.waitFor({ state: "visible" });
    await titleInput.fill("Test Artwork");

    await page.getByRole("button", { name: /upload artwork/i }).click();

    await expect(page.getByText(/artwork uploaded!/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: /view artworks/i }),
    ).toBeVisible();
  });

  test("shows error state on upload failure", async ({ page }) => {
    await page.route("**/api/artworks/presign", (route) => {
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "INVALID_FORMAT",
          message: "Only JPEG and PNG files are accepted.",
        }),
      });
    });

    await page.goto("/creator/artworks/new", { waitUntil: "networkidle" });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("fake-image-data"),
    });

    const titleInput = page.getByLabel(/title/i);
    await titleInput.waitFor({ state: "visible" });
    await titleInput.fill("Test Artwork");

    await page.getByRole("button", { name: /upload artwork/i }).click();

    await expect(page.getByText(/INVALID FORMAT/i)).toBeVisible();
    await expect(
      page.getByText(/only jpeg and png files are accepted/i),
    ).toBeVisible();
  });
});
