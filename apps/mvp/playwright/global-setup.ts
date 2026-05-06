import { spawnSync } from "node:child_process";
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
    console.log("");
    console.log("🔧 Missing test credentials — running database reset...");
    console.log("");

    const reset = spawnSync(
      "npx",
      ["dotenv-cli", "-e", ".env.test", "tsx", "scripts/reset-test-db.ts"],
      {
        cwd: resolve(__dirname, ".."),
        stdio: "inherit",
        shell: true,
      },
    );

    if (reset.status !== 0) {
      throw new Error("Database reset failed. See output above.");
    }

    // Reload environment after reset wrote new tokens
    loadEnv({ path: resolve(__dirname, "../.env.test.local"), override: true });
  }

  // Re-read tokens after potential reset
  const finalSessionToken = process.env.TEST_SESSION_TOKEN;
  const finalNoRoleSessionToken = process.env.NO_ROLE_SESSION_TOKEN;

  if (!finalSessionToken) {
    throw new Error("TEST_SESSION_TOKEN not available after reset");
  }

  const baseURL = config.projects[0].use.baseURL as string;

  mkdirSync("playwright/.auth", { recursive: true });

  await saveSessionState(
    baseURL,
    finalSessionToken,
    "playwright/.auth/user.json",
  );

  if (finalNoRoleSessionToken) {
    await saveSessionState(
      baseURL,
      finalNoRoleSessionToken,
      "playwright/.auth/no-role-user.json",
    );
    console.log("✅ No-role user auth state saved");
  }

  console.log("✅ Playwright auth setup complete");
  console.log(`   Test User ID: ${process.env.AUTH_BYPASS_TEST_USER_ID}`);
}

export default globalSetup;
