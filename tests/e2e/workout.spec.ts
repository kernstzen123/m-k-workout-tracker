import { expect, test, type Page } from "@playwright/test";
import { USERS, expectHome, signIn } from "./fixtures";

const bench = (page: Page) => page.getByRole("article", { name: "Barbell Bench Press" });

async function logSet(page: Page, n: number, weight?: string, reps?: string) {
  const card = bench(page);
  if (weight !== undefined) await card.getByLabel(`Set ${n} weight in kg`).fill(weight);
  if (reps !== undefined) await card.getByLabel(`Set ${n} reps`).fill(reps);
  await card.getByRole("button", { name: `Complete set ${n}` }).click();
  await expect(card.getByRole("button", { name: `Set ${n} done — tap to undo` })).toBeVisible();
}

test.describe("live workout logging", () => {
  test("log sets with rest timer, survive a reload, finish, and pre-fill next time", async ({
    page,
  }) => {
    await signIn(page, USERS.alice.email);
    await expectHome(page, "alice");

    // Start the suggested day straight from Home.
    await page.getByRole("button", { name: "Start Upper A" }).click();
    await expect(page).toHaveURL("/workout");
    await expect(bench(page)).toBeVisible();
    await expect(bench(page).getByText("First time")).toBeVisible();

    // Short rest so the alert path runs in the test.
    await bench(page).getByRole("button", { name: "Barbell Bench Press options" }).click();
    const menu = page.getByRole("dialog", { name: "Barbell Bench Press" });
    await menu.getByLabel("Rest (seconds)").fill("3");
    await menu.getByRole("button", { name: "Save rest time" }).click();

    // Set 1: type weight + reps, one tap to complete → rest timer starts.
    await logSet(page, 1, "60", "8");
    const timer = page.getByRole("region", { name: "Rest timer" });
    await expect(timer).toBeVisible();
    await expect(timer.getByText("Rest over")).toBeVisible({ timeout: 10_000 });
    await timer.getByRole("button", { name: "Dismiss rest timer" }).click();

    // Set 2 is pre-filled from set 1 — completing it is a single tap.
    await expect(bench(page).getByLabel("Set 2 weight in kg")).toHaveValue("60");
    await expect(bench(page).getByLabel("Set 2 reps")).toHaveValue("8");
    await logSet(page, 2);
    await page.getByRole("button", { name: "Skip rest" }).click();

    // Crash/close recovery: reload and the draft resumes with both sets.
    await page.reload();
    await expect(
      bench(page).getByRole("button", { name: "Set 2 done — tap to undo" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish" })).toBeVisible();

    // Finish.
    await page.getByRole("button", { name: "Finish" }).click();
    const finish = page.getByRole("dialog", { name: "Finish workout" });
    await expect(finish.getByText("960 kg")).toBeVisible(); // 2 × 60 × 8
    await finish.getByLabel("Session note").fill("Felt good");
    await finish.getByRole("button", { name: "Save workout" }).click();
    await expect(page).toHaveURL("/");

    // Rotation: Lower A is suggested next.
    await expect(page.getByRole("button", { name: "Start Lower A" })).toBeVisible();

    // Doing Upper A again: last session is shown and pre-fills the sets.
    await page.goto("/workout");
    await page.getByRole("button", { name: /^Upper A/ }).click();
    await expect(bench(page).locator("p").filter({ hasText: "Last time" })).toContainText(
      "60×8, 60×8",
    );
    await expect(bench(page).getByLabel("Set 1 weight in kg")).toHaveValue("60");
    await expect(bench(page).getByLabel("Set 1 reps")).toHaveValue("8");

    // Clean up: discard this second workout.
    await page.getByRole("button", { name: "Discard workout" }).click();
    await page
      .getByRole("dialog", { name: "Discard workout?" })
      .getByRole("button", { name: "Discard" })
      .click();
    await expect(page).toHaveURL("/");
  });

  test("add, swap and reorder exercises mid-session; log the cardio finisher", async ({ page }) => {
    await signIn(page, USERS.bob.email);
    await expectHome(page, "bob");
    await page.goto("/workout");
    await page.getByRole("button", { name: "Empty workout" }).click();

    await page.getByRole("button", { name: "Add exercise" }).click();
    let picker = page.getByRole("dialog", { name: "Add exercise" });
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill("lat pulldown");
    await picker.getByRole("button", { name: /^Lat Pulldown/ }).click();

    await page.getByRole("button", { name: "Add exercise" }).click();
    picker = page.getByRole("dialog", { name: "Add exercise" });
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill("incline treadmill");
    await picker.getByRole("button", { name: /^Incline Treadmill Walk/ }).click();

    // Swap Lat Pulldown → Pull-Up (allowed: no sets yet).
    await page.getByRole("button", { name: "Lat Pulldown options" }).click();
    await page
      .getByRole("dialog", { name: "Lat Pulldown" })
      .getByRole("button", { name: "Swap exercise" })
      .click();
    picker = page.getByRole("dialog", { name: "Swap exercise" });
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill("pull-up");
    await picker.getByRole("button", { name: /^Pull-Up/ }).click();
    await expect(page.getByRole("article", { name: "Pull-Up" })).toBeVisible();

    // Reorder with the non-drag alternative: move the cardio card up.
    await page.getByRole("button", { name: "Incline Treadmill Walk options" }).click();
    await page
      .getByRole("dialog", { name: "Incline Treadmill Walk" })
      .getByRole("button", { name: "Move up" })
      .click();
    const cards = page.getByRole("article");
    await expect(cards.first()).toHaveAttribute("aria-label", "Incline Treadmill Walk");

    // Log the cardio finisher in one tap.
    await page.getByRole("button", { name: "Log cardio" }).click();
    await expect(page.getByText("min logged")).toBeVisible();

    await page.getByRole("button", { name: "Finish" }).click();
    await page
      .getByRole("dialog", { name: "Finish workout" })
      .getByRole("button", { name: "Save workout" })
      .click();
    await expect(page).toHaveURL("/");
  });
});
