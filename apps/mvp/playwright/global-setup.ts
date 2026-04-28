import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

async function saveSessionState(
  baseURL: string,
  sessionToken: string,
  outPath: string,
) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });

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

  await context.storageState({ path: outPath });
  await browser.close();
}

async function globalSetup(config: FullConfig) {
  loadEnv({ path: resolve(__dirname, "../.env.test") });
  loadEnv({ path: resolve(__dirname, "../.env.test.local") });

  const sessionToken = process.env.TEST_SESSION_TOKEN;
  const testUserId = process.env.AUTH_BYPASS_TEST_USER_ID;
  const noRoleSessionToken = process.env.NO_ROLE_SESSION_TOKEN;

  if (!sessionToken || !testUserId) {
    console.error("");
    console.error("❌ Missing test credentials!");
    console.error("");
    console.error("Please run the following command first:");
    console.error("  pnpm test:reset");
    console.error("");
    throw new Error(
      "TEST_SESSION_TOKEN and AUTH_BYPASS_TEST_USER_ID must be set. Run 'pnpm test:reset' first.",
    );
  }

  const baseURL = config.projects[0].use.baseURL as string;

  mkdirSync("playwright/.auth", { recursive: true });

  await saveSessionState(baseURL, sessionToken, "playwright/.auth/user.json");

  if (noRoleSessionToken) {
    await saveSessionState(
      baseURL,
      noRoleSessionToken,
      "playwright/.auth/no-role-user.json",
    );
    console.log("✅ No-role user auth state saved");
  }

  console.log("✅ Playwright auth setup complete");
  console.log(`   Test User ID: ${testUserId}`);
}

export default globalSetup;
