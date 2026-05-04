import { expect, test } from "@playwright/test";

/**
 * Smoke test: verify collector orders page renders without crashing.
 */
test.describe("Collector Orders Smoke", () => {
  test("orders page renders with heading", async ({ page }) => {
    const response = await page.goto("/collector/orders");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
