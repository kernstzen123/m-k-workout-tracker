import { expect, test } from "@playwright/test";
import { USERS, expectHome, signIn } from "./fixtures";

test.describe("authentication & allowlist", () => {
  test("redirects signed-out visitors to the login screen", async ({ page }) => {
    await page.goto("/exercises");
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "M&K Workout" })).toBeVisible();
  });

  test("shows an error for a wrong password", async ({ page }) => {
    await signIn(page, USERS.alice.email, "wrong-password");
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  });

  test("blocks an account that is not allowlisted", async ({ page }) => {
    await signIn(page, USERS.mallory.email);
    await expect(page.getByRole("heading", { name: "This account isn't allowed" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("an allowlisted user signs in, sees the seeded library, and signs out", async ({ page }) => {
    await signIn(page, USERS.alice.email);
    await expectHome(page, "alice");

    await page.getByRole("link", { name: "More" }).click();
    await page.getByRole("link", { name: /Exercise library/ }).click();
    await expect(page.getByRole("button", { name: /^Barbell Bench Press/ })).toBeVisible();

    await page.getByRole("searchbox", { name: "Search exercises" }).fill("hip thrust barbell");
    await expect(page.getByRole("button", { name: /^Barbell Hip Thrust/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Barbell Bench Press/ })).toHaveCount(0);

    await page.getByRole("link", { name: "More" }).click();
    await page.getByRole("link", { name: /Settings/ }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("exercise library", () => {
  test("add, edit and archive an exercise (never deleted)", async ({ page }) => {
    await signIn(page, USERS.bob.email);
    await expectHome(page, "bob");
    await page.goto("/exercises");
    await expect(page.getByRole("button", { name: /^Barbell Bench Press/ })).toBeVisible();

    await page.getByRole("button", { name: "Add exercise" }).click();
    const sheet = page.getByRole("dialog", { name: "New exercise" });
    await sheet.getByLabel("Name").fill("Zercher Squat");
    await sheet.getByLabel("Primary muscle").selectOption("quads");
    await expect(sheet.getByLabel("Increment (kg)")).toHaveValue("5");
    await sheet.getByRole("button", { name: "Add exercise" }).click();

    await page.getByRole("searchbox", { name: "Search exercises" }).fill("zercher");
    await page.getByRole("button", { name: /^Zercher Squat/ }).click();
    await page
      .getByRole("dialog", { name: "Edit exercise" })
      .getByRole("button", { name: "Archive exercise" })
      .click();
    await expect(page.getByRole("button", { name: /^Zercher Squat/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Show archived" }).click();
    await expect(page.getByRole("button", { name: /^Zercher Squat Archived/ })).toBeVisible();
  });
});
