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
});
