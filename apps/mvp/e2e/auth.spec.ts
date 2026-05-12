import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("sign-in page loads with email input and submit button", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send magic link/i }),
    ).toBeVisible();
  });

  test("shows error for invalid email", async ({ page }) => {
    await page.goto("/auth/sign-in?error=invalid_email");

    await expect(
      page.getByText(/please enter a valid email address/i),
    ).toBeVisible();
  });

  test("email input is required", async ({ page }) => {
    await page.goto("/auth/sign-in");

    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("includes hidden callbackUrl input when redirect param is present", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in?redirect=/browse");

    const hiddenInput = page.locator(
      'input[type="hidden"][name="callbackUrl"]',
    );
    await expect(hiddenInput).toHaveValue("/browse");
  });

  test("includes hidden callbackUrl input when callbackUrl param is present", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in?callbackUrl=/browse");

    const hiddenInput = page.locator(
      'input[type="hidden"][name="callbackUrl"]',
    );
    await expect(hiddenInput).toHaveValue("/browse");
  });

  test("does not include hidden callbackUrl input when no redirect params", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");

    const hiddenInput = page.locator(
      'input[type="hidden"][name="callbackUrl"]',
    );
    await expect(hiddenInput).toHaveCount(0);
  });

  test("completes redirect flow after authentication", async ({ browser }) => {
    // Unauthenticated context
    const anonContext = await browser.newContext();
    const page = await anonContext.newPage();

    // Visit sign-in with redirect target
    await page.goto("/auth/sign-in?redirect=/browse");

    // Submit magic link form
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /send magic link/i }).click();

    // Should land on verify page
    await expect(page).toHaveURL("/auth/verify");

    await anonContext.close();

    // Now create an authenticated context using the saved auth state
    const authContext = await browser.newContext({
      storageState: "playwright/.auth/user.json",
    });
    const authPage = await authContext.newPage();

    // Authenticated user should be able to visit the target
    await authPage.goto("/browse");
    await expect(authPage).toHaveURL(/\/browse/);
    await expect(
      authPage.getByRole("heading", { name: /browse/i }),
    ).toBeVisible();

    await authContext.close();
  });
});
