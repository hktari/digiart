import { expect, test } from "@playwright/test";

/**
 * Health check smoke tests - verify deployed MVP is accessible
 */
test.describe("Health Checks", () => {
  test("homepage loads successfully", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("auth page is accessible", async ({ page }) => {
    const response = await page.goto("/auth/sign-in");
    expect(response?.status()).toBe(200);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send magic link/i }),
    ).toBeVisible();
  });

  test("browse creators page loads", async ({ page }) => {
    const response = await page.goto("/browse/creators");
    expect(response?.status()).toBeLessThan(500);
    // Page should render without errors
    await expect(page.locator("body")).not.toContainText("error");
  });
});
