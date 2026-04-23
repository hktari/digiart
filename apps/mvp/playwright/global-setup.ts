import { chromium, type FullConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

async function globalSetup(config: FullConfig) {
  loadEnv({ path: resolve(__dirname, "../.env.test") });
  loadEnv({ path: resolve(__dirname, "../.env.test.local") });

  const sessionToken = process.env.TEST_SESSION_TOKEN;
  const testUserId = process.env.AUTH_BYPASS_TEST_USER_ID;

  if (!sessionToken || !testUserId) {
    console.error("");
    console.error("❌ Missing test credentials!");
    console.error("");
    console.error("Please run the following command first:");
    console.error("  pnpm test:seed");
    console.error("");
    throw new Error(
      "TEST_SESSION_TOKEN and AUTH_BYPASS_TEST_USER_ID must be set. Run 'pnpm test:seed' first.",
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: config.projects[0].use.baseURL,
  });

  await context.addCookies([
    {
      name: "authjs.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
  ]);

  await context.storageState({
    path: "playwright/.auth/user.json",
  });

  await browser.close();

  console.log("✅ Playwright auth setup complete");
  console.log(`   Test User ID: ${testUserId}`);
}

export default globalSetup;
