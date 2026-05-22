import path from "node:path";
import { expect, test } from "../playwright/fixtures";

// Minimal valid PNG that is 1696×2528 px (meets print dimension requirements)
const TEST_ARTWORK_PATH = path.join(
  __dirname,
  "../playwright/test-artwork-1696x2528.png",
);

test.describe("Creator flow", () => {
  test("dashboard quick actions navigate to creator workflow pages", async ({
    page,
  }) => {
    // /creator redirects to the main dashboard
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /your workspace/i }),
    ).toBeVisible();

    // Navigate to creator artworks upload page
    await page.goto("/creator/artworks/new");
    await expect(
      page.getByRole("heading", { name: /upload artworks/i }),
    ).toBeVisible();

    // Navigate to creator new release page
    await page.goto("/creator/releases/new");
    await expect(
      page.getByRole("heading", { name: /create new release/i }),
    ).toBeVisible();
  });

  test("uploading from flow enables artworks list navigation", async ({
    page,
  }) => {
    await page.route("**/api/artworks/presign", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://s3.example.com/upload",
          pendingKey: "uploads/pending/e2e-flow-upload",
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
          artwork: { id: "e2e-flow-artwork" },
          warnings: [],
        }),
      });
    });

    await page.goto("/creator/artworks/new");

    // Use a real valid image (1696×2528 px) to pass client-side dimension validation
    await page.locator('input[type="file"]').setInputFiles(TEST_ARTWORK_PATH);

    await page.getByRole("button", { name: /upload 1 file/i }).click();
    await expect(page.getByText(/1 uploaded/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /view artworks/i }).click();
    await expect(
      page.getByRole("heading", { name: /artworks/i }),
    ).toBeVisible();
  });

  test("release flow enforces minimum artworks and updates CTA count", async ({
    page,
  }) => {
    await page.goto("/creator/releases/new");

    await page.getByLabel(/title/i).fill("Creator Flow Release");
    await page.getByRole("button", { name: /next: add artworks/i }).click();

    // With 0 artworks: minimum requirement shown and button disabled
    await expect(
      page.getByText(/minimum 5 required to publish/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create release with 0 artworks/i }),
    ).toBeDisabled();

    // Use real valid images (1696×2528 px) for 2 files
    await page
      .locator('input[type="file"]')
      .setInputFiles([TEST_ARTWORK_PATH, TEST_ARTWORK_PATH]);

    // 2 artworks selected, still below minimum — button still disabled
    await expect(
      page.getByRole("button", { name: /create release with 2 artworks/i }),
    ).toBeDisabled();
    // "3 more needed" (5 - 2 = 3)
    await expect(page.getByText(/3 more needed/i)).toBeVisible();
  });
});
