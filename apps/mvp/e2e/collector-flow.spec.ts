import { expect, test } from "../playwright/fixtures";

test.describe("Collector flow", () => {
  test("collector dashboard loads for seeded collector profile", async ({
    page,
  }) => {
    await page.goto("/collector");
    await expect(
      page.getByRole("heading", { name: /welcome back, e2e collector/i }),
    ).toBeVisible();
    await expect(page.getByText(/start your collection/i)).toBeVisible();
  });

  test("collector dashboard and nav pages are accessible", async ({ page }) => {
    await page.goto("/collector");

    await page.getByRole("link", { name: /discover releases/i }).click();
    await expect(page).toHaveURL(/\/collector\/discover/);
    await expect(
      page.getByRole("heading", { name: /discover/i }),
    ).toBeVisible();

    await page.locator('a[href="/collector/discover?view=releases"]').click();
    await expect(page).toHaveURL(/\/collector\/discover\?view=releases/);

    await page.goto("/collector/subscriptions");
    await expect(
      page.getByRole("heading", { name: /my subscriptions/i }),
    ).toBeVisible();

    await page.goto("/collector/releases");
    await expect(
      page.getByRole("heading", { name: /release selection/i }),
    ).toBeVisible();

    await page.goto("/collector/pricing");
    await expect(
      page.getByRole("heading", { name: /pricing estimate/i }),
    ).toBeVisible();
  });

  test("collector can add and remove release from discover", async ({
    page,
  }) => {
    await page.goto("/collector/discover?view=releases");

    const addButton = page
      .getByRole("button", { name: /add to booklet/i })
      .first();
    await addButton.click();

    await expect(
      page.getByText(/selected in this view:\s*[1-9]/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^remove$/i }).first(),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /^remove$/i })
      .first()
      .click();

    await expect(
      page.getByRole("button", { name: /add to booklet/i }).first(),
    ).toBeVisible();
  });
});
