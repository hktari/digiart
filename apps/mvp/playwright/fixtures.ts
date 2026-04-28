import { type BrowserContext, test as base } from "@playwright/test";

interface Fixtures {
  noRoleContext: BrowserContext;
}

export const test = base.extend<Fixtures>({
  noRoleContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "playwright/.auth/no-role-user.json",
    });
    await use(context);
    await context.close();
  },
});

export { expect } from "@playwright/test";
