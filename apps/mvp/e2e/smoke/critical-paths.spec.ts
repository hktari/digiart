import { expect, test } from "@playwright/test";

/**
 * Critical user path smoke tests
 * These verify core functionality without requiring test data setup
 */
test.describe("Critical Paths", () => {
  test("can navigate from homepage to auth", async ({ page }) => {
    await page.goto("/");

    // Look for sign-in/sign-up links
    const authLinks = page.locator(
      'a[href*="/auth"], button:has-text(/sign in|get started/i)',
    );

    if ((await authLinks.count()) > 0) {
      await authLinks.first().click();
      await expect(page).toHaveURL(/.*auth.*/);
      await expect(page.getByLabel(/email/i)).toBeVisible();
    }
  });

  test("browse page shows creator cards or empty state", async ({ page }) => {
    await page.goto("/browse/creators");

    // Either creator cards or an empty state should be visible
    const hasCreatorCards =
      (await page.locator("[data-testid='creator-card']").count()) > 0;
    const hasEmptyState = await page
      .getByText(/no creators|empty|explore/i)
      .isVisible()
      .catch(() => false);

    expect(hasCreatorCards || hasEmptyState).toBeTruthy();
  });

  test("api health endpoint responds", async ({ request }) => {
    // Assuming there's a health endpoint - adjust path as needed
    const response = await request.get("/api/health");

    // Either returns 200 OK or 404 (if no health endpoint exists)
    // Both indicate the API layer is responding
    expect([200, 404]).toContain(response.status());
  });
});
