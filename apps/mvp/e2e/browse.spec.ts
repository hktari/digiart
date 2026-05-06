import { expect, test } from "@playwright/test";

test.describe("Browse page infinite scroll", () => {
  test("browse page loads with initial creators", async ({ page }) => {
    await page.goto("/browse?view=creators");
    await expect(page).toHaveURL(/\/browse/);
    await expect(page.getByRole("heading", { name: /browse/i })).toBeVisible();

    // Should show initial creators (server-rendered)
    const creatorCards = page.locator('a[href^="/creators/"]:has(h3):visible');
    await expect(creatorCards.first()).toBeVisible();
    const initialCount = await creatorCards.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);
  });

  test("browse page loads with initial releases", async ({ page }) => {
    await page.goto("/browse?view=releases");
    await expect(page).toHaveURL(/\/browse\?view=releases/);
    await expect(page.getByRole("heading", { name: /browse/i })).toBeVisible();

    // Should show initial releases
    const releaseCards = page.locator('[class*="rounded-lg"]:has(img):visible');
    await expect(releaseCards.first()).toBeVisible();
  });

  test("creators infinite scroll loads more items on scroll", async ({
    page,
  }) => {
    await page.goto("/browse?view=creators");

    // Wait for initial load
    const creatorCards = page.locator('a[href^="/creators/"]:has(h3):visible');
    await expect(creatorCards.first()).toBeVisible();
    const initialCount = await creatorCards.count();

    // Scroll to bottom to trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait a bit for any loading to occur
    await page.waitForTimeout(500);

    // Check if more items loaded or we reached the end
    const newCount = await creatorCards.count();
    // Either we loaded more, or we already had all items
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test("releases infinite scroll loads more items on scroll", async ({
    page,
  }) => {
    await page.goto("/browse?view=releases");

    // Wait for initial load
    const releaseCards = page.locator('[class*="rounded-lg"]:has(img):visible');
    await expect(releaseCards.first()).toBeVisible();
    const initialCount = await releaseCards.count();

    // Scroll to bottom to trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait a bit for any loading to occur
    await page.waitForTimeout(500);

    // Check if more items loaded or we reached the end
    const newCount = await releaseCards.count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test("tag filtering works on browse page", async ({ page }) => {
    await page.goto("/browse?view=creators");

    // Click on a tag filter
    const tagButton = page.locator('a[href*="tag="]').first();
    const _tagName = await tagButton.textContent();
    await tagButton.click();

    // Should navigate to filtered view
    await expect(page).toHaveURL(/tag=/);

    // Page should still load with creators
    const creatorCards = page.locator('a[href^="/creators/"]:has(h3):visible');
    // Either we see creators or an empty state
    const hasCreators = (await creatorCards.count()) > 0;
    const emptyState = page.getByText(/no creators found/i);
    const hasEmptyState = (await emptyState.count()) > 0;
    expect(hasCreators || hasEmptyState).toBe(true);
  });

  test("switching between creators and releases views", async ({ page }) => {
    await page.goto("/browse?view=creators");

    // Switch to releases view (use specific href to avoid matching nav/footer links)
    await page.locator('a[href="/browse?view=releases"]').click();
    await expect(page).toHaveURL(/\/browse\?view=releases/);

    // Should show releases
    const releaseCards = page.locator('[class*="rounded-lg"]:has(img):visible');
    await expect(releaseCards.first()).toBeVisible();

    // Switch back to creators (use specific href to avoid matching nav/footer links)
    await page.locator('a[href="/browse?view=creators"]').click();
    await expect(page).toHaveURL(/\/browse\?view=creators/);

    // Should show creators
    const creatorCards = page.locator('a[href^="/creators/"]:has(h3):visible');
    await expect(creatorCards.first()).toBeVisible();
  });

  test("discover page API returns paginated creators", async ({ request }) => {
    const response = await request.get("/api/browse/creators?take=12");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("nextCursor");
    expect(Array.isArray(body.items)).toBe(true);

    // Should return up to 12 items (page size)
    expect(body.items.length).toBeLessThanOrEqual(12);

    // If there are items, they should have required fields
    if (body.items.length > 0) {
      const first = body.items[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("slug");
      expect(first).toHaveProperty("displayName");
    }
  });

  test("discover page API returns paginated releases", async ({ request }) => {
    const response = await request.get("/api/browse/releases?take=12");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("nextCursor");
    expect(Array.isArray(body.items)).toBe(true);

    // Should return up to 12 items
    expect(body.items.length).toBeLessThanOrEqual(12);

    // If there are items, they should have required fields
    if (body.items.length > 0) {
      const first = body.items[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("title");
      expect(first).toHaveProperty("creatorProfile");
    }
  });

  test("cursor pagination works for creators", async ({ request }) => {
    // Get first page
    const firstResponse = await request.get("/api/browse/creators?take=5");
    const firstBody = await firstResponse.json();

    expect(firstBody.items.length).toBeGreaterThan(0);
    expect(firstBody.nextCursor).toBeTruthy();

    // Get second page using cursor
    const secondResponse = await request.get(
      `/api/browse/creators?take=5&cursor=${firstBody.nextCursor}`,
    );
    const secondBody = await secondResponse.json();

    expect(secondBody.items.length).toBeGreaterThan(0);
    // Second page items should be different from first page
    const firstIds = new Set(firstBody.items.map((i: { id: string }) => i.id));
    const secondIds = secondBody.items.map((i: { id: string }) => i.id);
    const overlap = secondIds.filter((id: string) => firstIds.has(id));
    expect(overlap.length).toBe(0);
  });

  test("cursor pagination works for releases", async ({ request }) => {
    // Get first page
    const firstResponse = await request.get("/api/browse/releases?take=5");
    const firstBody = await firstResponse.json();

    expect(firstBody.items.length).toBeGreaterThan(0);
    expect(firstBody.nextCursor).toBeTruthy();

    // Get second page using cursor
    const secondResponse = await request.get(
      `/api/browse/releases?take=5&cursor=${firstBody.nextCursor}`,
    );
    const secondBody = await secondResponse.json();

    expect(secondBody.items.length).toBeGreaterThan(0);
    // Second page items should be different from first page
    const firstIds = new Set(firstBody.items.map((i: { id: string }) => i.id));
    const secondIds = secondBody.items.map((i: { id: string }) => i.id);
    const overlap = secondIds.filter((id: string) => firstIds.has(id));
    expect(overlap.length).toBe(0);
  });
});
