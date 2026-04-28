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

    // Progress bar labels
    await expect(page.getByText("Profile")).toBeVisible();
    await expect(page.getByText("Payout")).toBeVisible();
    await expect(page.getByText("Review")).toBeVisible();
  });

  test("profile step validates required fields", async ({ page }) => {
    await page.goto("/creator/setup");

    // Click "Continue" without filling anything
    await page.getByRole("button", { name: /continue to payout/i }).click();

    await expect(page.getByText(/display name is required/i)).toBeVisible();
    await expect(page.getByText(/slug is required/i)).toBeVisible();
  });

  test("profile step advances to payout when valid", async ({ page }) => {
    await page.goto("/creator/setup");

    await page.getByLabel(/display name/i).fill("E2E Test Creator");
    await page.getByLabel(/profile slug/i).fill("e2e-test-creator");

    await page.getByRole("button", { name: /continue to payout/i }).click();

    // Should now show payout step
    await expect(
      page.getByRole("button", { name: /continue to review/i }),
    ).toBeVisible();
  });

  test("full setup flow saves profile and advances past review step", async ({
    page,
  }) => {
    test.slow();

    await page.goto("/creator/setup");

    // Step 1 – Profile
    await page.getByLabel(/display name/i).fill("E2E Test Creator");
    await page.getByLabel(/profile slug/i).fill("e2e-test-creator");
    await page.getByLabel(/bio/i).fill("An artist created by automated tests.");

    await page.getByRole("button", { name: /continue to payout/i }).click();

    // Step 2 – Payout (optional, skip)
    await expect(
      page.getByRole("button", { name: /continue to review/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /continue to review/i }).click();

    // Step 3 – Review: confirm data is shown
    await expect(page.getByText(/e2e test creator/i)).toBeVisible();
    await expect(page.getByText(/e2e-test-creator/i)).toBeVisible();

    // Submit — the review step's Continue button saves the CreatorProfile
    await page.getByRole("button", { name: /^continue$/i }).click();

    // Must advance to the artwork upload step (NOT stay on review).
    // This confirms the server action succeeded and the profile now exists.
    await expect(page.getByText(/uploaded artworks/i)).toBeVisible({
      timeout: 20000,
    });
  });
});
