import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const PROJECT_ID = "demo-mk-workout";
export const AUTH_EMULATOR = "http://127.0.0.1:9099";
export const FIRESTORE_EMULATOR = "http://127.0.0.1:8080";
export const PASSWORD = "test-password-123";

/** UIDs match the test allowlist baked into firestore.rules by `rules:build:test`. */
export const USERS = {
  alice: { uid: "alice", email: "alice@example.test" },
  bob: { uid: "bob", email: "bob@example.test" },
  mallory: { uid: "mallory", email: "mallory@example.test" },
} as const;

export async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function expectHome(page: Page, name: string): Promise<void> {
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: `Hi ${name}` })).toBeVisible();
}

/**
 * Extra browser contexts (e.g. one per partner) that are always closed after the test, so their
 * live Firestore listeners don't pile up in the shared browser for later test files.
 */
export function contexts() {
  const open: BrowserContext[] = [];
  return {
    async page(browser: Browser): Promise<Page> {
      const context = await browser.newContext();
      open.push(context);
      return context.newPage();
    },
    async closeAll(): Promise<void> {
      await Promise.all(open.splice(0).map((c) => c.close()));
    },
  };
}
