import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke test configuration for post-deployment verification.
 * Targets the deployed MVP (Railway) without local server.
 */
export default defineConfig({
  testDir: "./e2e/smoke",
  fullyParallel: true,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [["html"], ["list"]],
  use: {
    baseURL:
      process.env.MVP_DEPLOYMENT_URL || process.env.RAILWAY_PUBLIC_DOMAIN,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
