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

  test("preserves redirect query param in sign-up link", async ({ page }) => {
    await page.goto("/auth/sign-in?redirect=/browse");

    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toHaveAttribute(
      "href",
      "/auth/sign-up?callbackUrl=%2Fbrowse",
    );
  });

  test("preserves callbackUrl query param in sign-up link", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in?callbackUrl=/browse");

    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toHaveAttribute(
      "href",
      "/auth/sign-up?callbackUrl=%2Fbrowse",
    );
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
});
