import { expect, test } from "../playwright/fixtures";

test.describe("Creator Artworks", () => {
  test("creator artworks page loads", async ({ page }) => {
    await page.goto("/creator/artworks");

    await expect(
      page.getByRole("heading", { name: /artworks/i }),
    ).toBeVisible();
  });

  test("shows upload button when no artworks exist", async ({ page }) => {
    await page.goto("/creator/artworks");

    // Should show "No artworks yet" message and upload button
    await expect(page.getByText(/no artworks yet/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /upload artwork/i }),
    ).toBeVisible();
  });
});
