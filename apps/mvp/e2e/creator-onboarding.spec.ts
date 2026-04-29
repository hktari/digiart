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

    // Progress bar step labels (use span locator to avoid ambiguity)
    await expect(
      page.locator("span").filter({ hasText: /^Profile$/ }),
    ).toBeVisible();
    await expect(
      page.locator("span").filter({ hasText: /^Payout$/ }),
    ).toBeVisible();
    await expect(
      page.locator("span").filter({ hasText: /^Review$/ }),
    ).toBeVisible();
  });

  test("profile step validates required fields", async ({ page }) => {
    await page.goto("/creator/setup");

    // Clear fields in case a profile pre-exists (pre-fills them)
    await page.getByLabel(/display name/i).fill("");
    await page.getByLabel(/profile slug/i).fill("");

    // Click "Continue" without filling anything
    await page
      .getByRole("button", { name: /continue to payout settings/i })
      .click();

    await expect(page.getByText(/display name is required/i)).toBeVisible();
    await expect(page.getByText(/slug is required/i)).toBeVisible();
  });

  test("profile step advances to payout when valid", async ({ page }) => {
    await page.goto("/creator/setup");

    await page.getByLabel(/display name/i).fill("E2E Test Creator");
    await page.getByLabel(/profile slug/i).fill("e2e-test-creator");

    await page
      .getByRole("button", { name: /continue to payout settings/i })
      .click();

    // Should now show payout step — button label is "Review"
    await expect(page.getByRole("button", { name: /^Review$/ })).toBeVisible();
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

    await page
      .getByRole("button", { name: /continue to payout settings/i })
      .click();

    // Step 2 – Payout (optional, skip) — button label is "Review"
    await expect(page.getByRole("button", { name: /^Review$/ })).toBeVisible();
    await page.getByRole("button", { name: /^Review$/ }).click();

    // Step 3 – Review: confirm data is shown
    await expect(page.getByText(/e2e test creator/i)).toBeVisible();
    await expect(page.getByText(/e2e-test-creator/i)).toBeVisible();

    // Submit — saveCreatorProfile server action fires and creates the profile.
    // RSC redirect (303) doesn't trigger browser navigation in Playwright;
    // we manually navigate to /creator to confirm the profile was saved.
    await page.getByRole("button", { name: /^continue$/i }).click();

    // Wait for the server action POST to complete (3-4s on this DB).
    await page.waitForResponse(
      (res) => res.url().includes("/creator/setup") && res.status() === 303,
      { timeout: 30000 },
    );

    // Navigate to the dashboard to confirm the profile exists.
    await page.goto("/creator");
    await expect(
      page.getByRole("heading", { name: /e2e test creator/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});
