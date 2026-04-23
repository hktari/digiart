import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 30000, // Increased global timeout to give room for retries/actions
  expect: {
    timeout: 10000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./playwright/global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005",
    trace: "on-first-retry",
    storageState: "playwright/.auth/user.json",
    screenshot: "only-on-failure",
    actionTimeout: 10000, // Match expect timeout
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "node scripts/dev-with-test-env.js",
    url: "http://localhost:3005",
    reuseExistingServer: !process.env.CI,
  },
});
