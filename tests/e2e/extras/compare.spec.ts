import { expect, test, type Page } from "@playwright/test";
import { USERS, expectHome, signIn, contexts } from "../fixtures";

const extra = contexts();
test.afterEach(() => extra.closeAll());

async function setSharing(page: Page, on: boolean) {
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: /Share my lifts in Compare/ });
  if ((await toggle.getAttribute("aria-checked")) !== String(on)) await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", String(on));
}

test.describe("compare", () => {
  test("shows both partners' records side by side and respects the opt-out", async ({
    browser,
  }) => {
    const bob = await extra.page(browser);
    const alice = await extra.page(browser);

    // Bob logs a bench session (Alice already has bench records from the core flows).
    await signIn(bob, USERS.bob.email);
    await expectHome(bob, "bob");
    await bob.goto("/workout");
    await bob.getByRole("button", { name: /^Upper A/ }).click();
    const bench = bob.getByRole("article", { name: "Barbell Bench Press" });
    await bench.getByLabel("Set 1 weight in kg").fill("55");
    await bench.getByLabel("Set 1 reps").fill("6");
    await bench.getByRole("button", { name: "Complete set 1" }).click();
    await bob.getByRole("button", { name: "Skip rest" }).click();
    await bob.getByRole("button", { name: "Finish" }).click();
    await bob
      .getByRole("dialog", { name: "Finish workout" })
      .getByRole("button", { name: "Save workout" })
      .click();
    await expect(bob).toHaveURL("/");

    // Alice compares heaviest weights.
    await signIn(alice, USERS.alice.email);
    await expectHome(alice, "alice");
    await alice.goto("/compare");
    await alice.getByRole("button", { name: "Heaviest" }).click();
    const figure = alice.getByRole("figure").filter({ hasText: "Personal records" });
    const row = figure.getByRole("listitem").filter({ hasText: "Barbell Bench Press" });
    await expect(row).toContainText("62.5 kg × 6");
    await expect(row).toContainText("55 kg × 6");
    await expect(figure.getByLabel("Legend")).toContainText("bob");

    // Trend chart for a lift both have done.
    await expect(alice.getByRole("figure").filter({ hasText: "Est. 1RM over time" })).toBeVisible();

    // Bob opts out → Alice can no longer see his numbers (enforced by the security rules too).
    await setSharing(bob, false);
    await alice.reload();
    await expect(alice.getByRole("heading", { name: "bob isn't sharing" })).toBeVisible();

    // Alice opting out hides the page for her as well (two-way).
    await setSharing(alice, false);
    await alice.goto("/compare");
    await expect(alice.getByRole("heading", { name: "You've hidden your lifts" })).toBeVisible();

    // Restore.
    await setSharing(alice, true);
    await setSharing(bob, true);
  });
});
