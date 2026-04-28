import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  globalSetup: "./playwright/global-setup.ts",
  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
    storageState: "playwright/.auth/user.json",
    screenshot: "only-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    // 1. Onboarding — must run first; creates the CreatorProfile
    {
      name: "creator-onboarding",
      testMatch: "e2e/creator-onboarding.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // 2. Profile & social links — requires CreatorProfile from step 1
    {
      name: "creator-profile",
      testMatch: "e2e/creator-profile.spec.ts",
      dependencies: ["creator-onboarding"],
      use: { ...devices["Desktop Chrome"] },
    },

    // 3. Artwork upload — requires CreatorProfile from step 1
    {
      name: "creator-artworks",
      testMatch: "e2e/artwork-upload.spec.ts",
      dependencies: ["creator-onboarding"],
      use: { ...devices["Desktop Chrome"] },
    },

    // 4. Release creation — requires CreatorProfile from step 1
    {
      name: "creator-release",
      testMatch: "e2e/creator-release.spec.ts",
      dependencies: ["creator-onboarding"],
      use: { ...devices["Desktop Chrome"] },
    },

    // 5. All other tests (auth, smoke, etc.) — no creator-flow dependency
    {
      name: "general",
      testIgnore: [
        "e2e/creator-onboarding.spec.ts",
        "e2e/creator-profile.spec.ts",
        "e2e/creator-release.spec.ts",
        "e2e/artwork-upload.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // webServer: {
  //   command: "node scripts/dev-with-test-env.js",
  //   url: "http://localhost:3003",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
