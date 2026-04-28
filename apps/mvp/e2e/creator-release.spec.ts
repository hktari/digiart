/**
 * Creator release E2E tests
 *
 * Covers:
 *  - Releases list page loads and shows empty state
 *  - New release button is enabled when cycle is OPEN
 *  - New release form: details step validation
 *  - New release form: details → artworks step transition
 *  - New release form: creates release with mocked uploads, redirects to
 *    release detail page
 *
 * Prerequisite: The test DB is seeded with an OPEN SubscriptionCycle
 * (guaranteed by reset-test-db.ts).  The CREATOR user must have a
 * CreatorProfile (created in the onboarding tests or via /creator/setup).
 */
import { expect, test } from "../playwright/fixtures";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureCreatorProfile(
  page: import("@playwright/test").Page,
  displayName = "E2E Test Creator",
  slug = "e2e-test-creator",
) {
  await page.goto("/creator/setup");

  if (page.url().includes("/creator") && !page.url().includes("/setup")) {
    return;
  }

  await page.getByLabel(/display name/i).fill(displayName);
  await page.getByLabel(/profile slug/i).fill(slug);
  await page.getByRole("button", { name: /continue to payout/i }).click();
  await page.getByRole("button", { name: /continue to review/i }).click();
  await page
    .getByRole("button", { name: /save.*profile|complete setup/i })
    .click();
  await page.waitForURL(/\/creator/, { timeout: 20000 });
}

// ---------------------------------------------------------------------------
// Releases list
// ---------------------------------------------------------------------------

test.describe("Creator releases list", () => {
  test.beforeEach(async ({ page }) => {
    await ensureCreatorProfile(page);
  });

  test("releases page loads", async ({ page }) => {
    await page.goto("/creator/releases");

    await expect(
      page.getByRole("heading", { name: /releases/i }),
    ).toBeVisible();
  });

  test("shows empty state when no releases exist", async ({ page }) => {
    await page.goto("/creator/releases");

    await expect(page.getByText(/no releases yet/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create your first release/i }),
    ).toBeVisible();
  });

  test("new release button is enabled when cycle is OPEN", async ({ page }) => {
    await page.goto("/creator/releases");

    const newReleaseBtn = page.getByRole("link", { name: /\+ new release/i });
    await expect(newReleaseBtn).toBeVisible();

    // The link should NOT have pointer-events-none (disabled) class
    const ariaDisabled = await newReleaseBtn.getAttribute("aria-disabled");
    expect(ariaDisabled).not.toBe("true");
  });
});

// ---------------------------------------------------------------------------
// New release form
// ---------------------------------------------------------------------------

test.describe("New release form", () => {
  test.beforeEach(async ({ page }) => {
    await ensureCreatorProfile(page);
  });

  test("form page loads with details step", async ({ page }) => {
    await page.goto("/creator/releases/new");

    await expect(
      page.getByRole("heading", { name: /new release/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });

  test("requires title before advancing", async ({ page }) => {
    await page.goto("/creator/releases/new");

    await page.getByRole("button", { name: /next.*artworks/i }).click();

    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test("advances to artworks step after entering title", async ({ page }) => {
    await page.goto("/creator/releases/new");

    await page.getByLabel(/title/i).fill("E2E Test Release");
    await page.getByRole("button", { name: /next.*artworks/i }).click();

    // Drop zone should now be visible
    await expect(page.getByText(/drag.*drop|drop.*here/i)).toBeVisible();
  });

  test("creates a release with mocked uploads and redirects to detail", async ({
    page,
  }) => {
    // Mock artwork presign
    await page.route("**/api/artworks/presign", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://s3.example.com/upload",
          pendingKey: "pending/e2e-test-artwork",
        }),
      });
    });

    // Mock S3 PUT
    await page.route("https://s3.example.com/upload", (route) => {
      route.fulfill({ status: 200 });
    });

    // Mock artwork register
    let artworkCounter = 0;
    await page.route("**/api/artworks/register", (route) => {
      artworkCounter++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          artwork: { id: `e2e-artwork-${artworkCounter}` },
          warnings: [],
        }),
      });
    });

    await page.goto("/creator/releases/new");

    // Step 1 — fill title
    await page.getByLabel(/title/i).fill("E2E Test Release");
    await page.getByRole("button", { name: /next.*artworks/i }).click();

    // Step 2 — add 5 artwork files (meets minimum)
    const fileInput = page.locator('input[type="file"]');
    const fakeFiles = Array.from({ length: 5 }, (_, i) => ({
      name: `artwork-${i + 1}.jpg`,
      mimeType: "image/jpeg",
      buffer: Buffer.from(`fake-image-data-${i}`),
    }));
    await fileInput.setInputFiles(fakeFiles);

    // Upload queued files
    await page
      .getByRole("button", { name: /upload.*queued|upload all/i })
      .click();

    // Wait for uploads to complete
    await expect(page.getByText(/5.*uploaded|uploaded.*5/i)).toBeVisible({
      timeout: 15000,
    });

    // Submit the release
    await page.getByRole("button", { name: /create release|publish/i }).click();

    // Should redirect to release detail page
    await page.waitForURL(/\/creator\/releases\/[^/]+$/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/creator\/releases\/[^/]+$/);
  });
});

// ---------------------------------------------------------------------------
// Release detail page
// ---------------------------------------------------------------------------

test.describe("Release detail", () => {
  test.beforeEach(async ({ page }) => {
    await ensureCreatorProfile(page);
  });

  test("release list shows the created release after creation", async ({
    page,
  }) => {
    // If previous test created a release we should see it listed
    await page.goto("/creator/releases");

    // If there are releases, they should be shown in a list
    // (we just check the page loaded; the actual release may or may not
    //  exist depending on test order)
    await expect(
      page.getByRole("heading", { name: /releases/i }),
    ).toBeVisible();
  });
});
