/**
 * Creator onboarding E2E tests
 *
 * Runs the multi-step creator setup form as the pre-seeded CREATOR user
 * (who starts with no CreatorProfile after each DB reset).
 *
 * This project MUST run before creator-profile and creator-release because
 * those suites depend on the CreatorProfile created by the final test here.
 * Ordering is enforced via Playwright project dependencies in
 * playwright.config.ts.
 */
import { expect, test } from "../playwright/fixtures";

// ---------------------------------------------------------------------------
// Creator setup form
// ---------------------------------------------------------------------------

test.describe("Creator setup form", () => {
  test("setup page loads with multi-step form", async ({ page }) => {
    await page.goto("/creator/setup");

    await expect(
      page.getByRole("heading", { name: /creator setup/i }),
    ).toBeVisible();

    // Progress bar step labels (use text locator to avoid ambiguity)
    await expect(page.getByText(/^Profile$/).first()).toBeVisible();
    await expect(page.getByText(/^Artwork$/).first()).toBeVisible();
    await expect(page.getByText(/^Share$/).first()).toBeVisible();
  });

  test("profile step validates required fields", async ({ page }) => {
    await page.goto("/creator/setup");

    // Clear display name field (slug may be locked for edit if profile exists)
    await page.getByLabel(/display name/i).fill("");

    // Click "Continue" without filling anything
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page.getByText(/display name is required/i)).toBeVisible();
  });

  test("profile step advances to artwork when valid", async ({ page }) => {
    await page.goto("/creator/setup");

    await page.getByLabel(/display name/i).fill("E2E Test Creator");

    // Slug may already be set; try to fill it if the input is editable
    const slugInput = page.getByLabel(/profile slug/i);
    if (await slugInput.isVisible()) {
      await slugInput.fill("e2e-test-creator");
    }

    await page.getByRole("button", { name: /^continue$/i }).click();

    // Should now show artwork step — upload artwork button is visible
    await expect(
      page
        .getByRole("button", { name: /upload artwork/i })
        .or(page.getByText(/upload artwork/i))
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("full setup flow creates creator profile", async ({ page }) => {
    test.slow();

    await page.goto("/creator/setup");

    // Step 1 – Profile: fill required fields and submit
    await page.getByLabel(/display name/i).fill("E2E Test Creator");

    const slugInput = page.getByLabel(/profile slug/i);
    if (await slugInput.isVisible()) {
      await slugInput.fill("e2e-test-creator");
    }

    await page.getByRole("button", { name: /^continue$/i }).click();

    // Step 2 – Artwork step is now shown (profile was saved)
    await expect(
      page
        .getByRole("button", { name: /upload artwork/i })
        .or(page.getByText(/upload artwork/i))
        .first(),
    ).toBeVisible({ timeout: 15000 });

    // The profile was saved when we clicked Continue on step 1.
    // Navigate to /creator/profile to confirm the display name was persisted.
    await page.goto("/creator/profile");
    await expect(
      page.getByRole("heading", { name: /profile and payouts/i }),
    ).toBeVisible({ timeout: 10000 });
    // Display name input should be pre-filled with what we submitted
    await expect(page.getByLabel(/display name/i)).toHaveValue(
      /e2e test creator/i,
    );
  });
});
