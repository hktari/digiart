/**
 * Creator profile E2E tests
 *
 * Covers:
 *  - Profile edit page loads
 *  - Avatar upload (mocked S3 presign + PUT)
 *  - Social links: add, validate, save, delete
 *
 * Prerequisite: creator-onboarding project must have run first (enforced by
 * Playwright project dependencies in playwright.config.ts). The CREATOR user
 * will already have a CreatorProfile created during the onboarding flow.
 */
import { expect, test } from "../playwright/fixtures";

// ---------------------------------------------------------------------------
// Profile edit page
// ---------------------------------------------------------------------------

test.describe("Creator profile edit", () => {
  test("profile edit page loads", async ({ page }) => {
    await page.goto("/creator/profile");

    await expect(
      page.getByRole("heading", { name: /edit profile/i }),
    ).toBeVisible();
    await expect(page.getByText(/payout/i)).toBeVisible();
    await expect(page.getByText(/social links/i)).toBeVisible();
  });

  test("avatar section is visible", async ({ page }) => {
    await page.goto("/creator/profile");

    // Avatar upload area should be visible
    await expect(page.getByRole("button", { name: /change/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Avatar upload
// ---------------------------------------------------------------------------

test.describe("Avatar upload", () => {
  test("shows error for non-image file type", async ({ page }) => {
    await page.goto("/creator/profile");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake-pdf"),
    });

    await expect(page.getByText(/only jpeg, png or webp/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("uploads avatar image (mocked S3)", async ({ page }) => {
    await page.route("**/api/avatar/presign", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://s3.example.com/avatar-upload",
          key: "avatars/test-avatar-123.jpg",
        }),
      });
    });

    await page.route("https://s3.example.com/avatar-upload", (route) => {
      route.fulfill({ status: 200 });
    });

    await page.goto("/creator/profile");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "avatar.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-data"),
    });

    // A preview or uploading indicator should appear
    await expect(page.getByText(/uploading|saving|saved/i)).toBeVisible({
      timeout: 10000,
    });
  });
});

// ---------------------------------------------------------------------------
// Social links
// ---------------------------------------------------------------------------

test.describe("Social links", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/creator/profile");
  });

  test("shows social links section", async ({ page }) => {
    await expect(page.getByText(/social links/i)).toBeVisible();
  });

  test("can add a social link", async ({ page }) => {
    await page.getByRole("button", { name: /add link/i }).click();

    // A new link row should appear with label and URL inputs
    await expect(page.getByLabel(/label/i).last()).toBeVisible();
    await expect(page.getByLabel(/url/i).last()).toBeVisible();
  });

  test("validates required fields on save", async ({ page }) => {
    await page.getByRole("button", { name: /add link/i }).click();

    // Try to save without filling in the link
    await page.getByRole("button", { name: /save links|save social/i }).click();

    await expect(page.getByText(/label is required/i)).toBeVisible();
    await expect(page.getByText(/url is required/i)).toBeVisible();
  });

  test("validates URL format", async ({ page }) => {
    await page.getByRole("button", { name: /add link/i }).click();

    // Select a label from the dropdown
    const labelSelect = page.getByLabel(/label/i).last();
    await labelSelect.selectOption("Instagram");

    // Enter invalid URL
    await page.getByLabel(/url/i).last().fill("not-a-url");

    await page.getByRole("button", { name: /save links|save social/i }).click();

    await expect(page.getByText(/must be a valid url/i)).toBeVisible();
  });

  test("saves a valid social link", async ({ page }) => {
    await page.getByRole("button", { name: /add link/i }).click();

    const labelSelect = page.getByLabel(/label/i).last();
    await labelSelect.selectOption("Instagram");

    await page.getByLabel(/url/i).last().fill("https://instagram.com/e2etest");

    await page.getByRole("button", { name: /save links|save social/i }).click();

    await expect(page.getByText(/social links have been saved/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("can remove a social link", async ({ page }) => {
    // Add a link first
    await page.getByRole("button", { name: /add link/i }).click();

    const labelSelect = page.getByLabel(/label/i).last();
    await labelSelect.selectOption("Website");

    await page.getByLabel(/url/i).last().fill("https://example.com");

    // Remove it
    await page
      .getByRole("button", { name: /remove/i })
      .last()
      .click();

    // No more link rows visible
    await expect(page.getByLabel(/url/i)).toHaveCount(0);
  });
});
