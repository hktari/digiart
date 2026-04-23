import { expect, test } from "../playwright/fixtures";

test.describe("Onboarding", () => {
  test.skip("authenticated user with no role sees Creator and Collector buttons", async ({
    page,
  }) => {
    // Skipped: Test user has CREATOR role, so they get redirected from /onboarding
    // To test this, you'd need a user without any roles
    await page.goto("/onboarding");

    await expect(page.getByRole("button", { name: /creator/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /collector/i }),
    ).toBeVisible();
  });

  test.skip("displays welcome message", async ({ page }) => {
    // Skipped: Test user has CREATOR role, so they get redirected from /onboarding
    await page.goto("/onboarding");

    await expect(
      page.getByText(/welcome! how will you use the platform/i),
    ).toBeVisible();
  });

  test.skip("shows role descriptions", async ({ page }) => {
    // Skipped: Test user has CREATOR role, so they get redirected from /onboarding
    await page.goto("/onboarding");

    await expect(page.getByText(/upload artworks/i)).toBeVisible();
    await expect(page.getByText(/subscribe to creators/i)).toBeVisible();
  });
});
