import { expect, test } from "../playwright/fixtures";

test.describe("Creator Artworks", () => {
  test("creator artworks page loads", async ({ page }) => {
    await page.goto("/creator/artworks");

    await expect(
      page.getByRole("heading", { name: /artworks/i }),
    ).toBeVisible();
  });

  test("shows placeholder when no artworks exist", async ({ page }) => {
    await page.goto("/creator/artworks");

    await expect(page.getByText(/coming soon/i)).toBeVisible();
  });
});
