import { expect, test } from "../playwright/fixtures";

test.describe("Creator flow", () => {
  test("dashboard quick actions navigate to creator workflow pages", async ({
    page,
  }) => {
    await page.goto("/creator");

    await expect(
      page.getByRole("heading", { name: /e2e test creator/i }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /upload artwork/i })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: /upload artworks/i }),
    ).toBeVisible();

    await page.goto("/creator");
    await page
      .getByRole("link", { name: /new release/i })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: /new release/i }),
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

    await page.locator('input[type="file"]').setInputFiles({
      name: "flow-artwork.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-data"),
    });

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

    await expect(
      page.getByText(/add at least 5 artworks to create a release/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create release with 0 artworks/i }),
    ).toBeDisabled();

    await page.locator('input[type="file"]').setInputFiles([
      {
        name: "flow-1.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("flow-file-1"),
      },
      {
        name: "flow-2.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("flow-file-2"),
      },
    ]);

    await expect(
      page.getByRole("button", { name: /create release with 2 artworks/i }),
    ).toBeDisabled();
    await expect(page.getByText(/3 more artworks needed/i)).toBeVisible();
  });
});
