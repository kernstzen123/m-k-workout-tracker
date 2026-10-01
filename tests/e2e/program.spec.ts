import { expect, test, type Page } from "@playwright/test";
import { USERS, expectHome, signIn } from "./fixtures";

async function openProgram(page: Page) {
  await page.goto("/program");
  await expect(page.getByRole("heading", { name: "Full Body" })).toBeVisible();
}

test.describe("shared program", () => {
  test("seeds the Upper / Lower / Upper / Lower / Full Body split", async ({ page }) => {
    await signIn(page, USERS.alice.email);
    await expectHome(page, "alice");
    await openProgram(page);
    for (const day of ["Upper A", "Lower A", "Upper B", "Lower B", "Full Body"]) {
      await expect(page.getByRole("heading", { name: day, exact: true })).toBeVisible();
    }
  });

  test("an edit by one partner applies to both, and conflicts prompt before overwriting", async ({
    browser,
  }) => {
    const alice = await (await browser.newContext()).newPage();
    const bob = await (await browser.newContext()).newPage();
    await signIn(alice, USERS.alice.email);
    await expectHome(alice, "alice");
    await signIn(bob, USERS.bob.email);
    await expectHome(bob, "bob");

    // Both open the editor on the same version.
    await openProgram(alice);
    await openProgram(bob);
    await alice.getByRole("button", { name: "Edit" }).click();
    await bob.getByRole("button", { name: "Edit" }).click();

    // Bob renames Full Body and saves first.
    await bob.getByLabel("Day 5 name").fill("Full Body Pump");
    await bob.getByRole("button", { name: "Save program" }).click();
    await expect(bob.getByRole("heading", { name: "Full Body Pump" })).toBeVisible();

    // Alice sees the warning while still editing, then gets the overwrite prompt on save.
    await expect(
      alice.getByRole("alert").filter({ hasText: "saved a newer version" }),
    ).toBeVisible();
    await alice.getByRole("button", { name: "Increase Dumbbell Bench Press sets" }).click();
    await alice.getByRole("button", { name: "Save program" }).click();
    const dialog = alice.getByRole("dialog", { name: "Program changed" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep theirs" }).click();

    // Alice's view now shows Bob's version, credited to him.
    await expect(alice.getByRole("heading", { name: "Full Body Pump" })).toBeVisible();
    await expect(alice.getByText(/Last edited by bob/)).toBeVisible();
  });
});
