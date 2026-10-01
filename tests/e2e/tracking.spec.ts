import { expect, test } from "@playwright/test";
import { USERS, expectHome, signIn } from "./fixtures";

test.describe("cardio and body tracking", () => {
  test("log cardio and see it in the weekly totals", async ({ page }) => {
    await signIn(page, USERS.bob.email);
    await expectHome(page, "bob");
    await page.goto("/cardio");

    await page.getByRole("button", { name: "Log cardio" }).click();
    const form = page.getByRole("dialog", { name: "Log cardio" });
    await form.getByLabel("Type").selectOption("Rowing Machine");
    await form.getByLabel("Minutes").fill("25");
    await form.getByLabel("Distance (km)").fill("5");
    await form.getByRole("button", { name: "Moderate" }).click();
    await form.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Rowing Machine")).toBeVisible();
    await expect(page.getByText(/25 min · 5 km · moderate/)).toBeVisible();
    await page.getByText("Show as table").click();
    await expect(page.getByRole("table")).toContainText("25");

    // Delete it again.
    await page.getByRole("button", { name: /Delete Rowing Machine/ }).click();
    await page
      .getByRole("dialog", { name: "Delete entry?" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByText("Rowing Machine")).toHaveCount(0);
  });

  test("record bodyweight and tape; see the 7-day average", async ({ page }) => {
    await signIn(page, USERS.bob.email);
    await expectHome(page, "bob");
    await page.goto("/body");

    for (const [date, kg] of [
      ["2026-09-28", "81.0"],
      ["2026-09-30", "80.0"],
    ] as const) {
      await page.getByRole("button", { name: "Add measurement" }).click();
      const form = page.getByRole("dialog", { name: "Add measurement" });
      await form.getByLabel("Date").fill(date);
      await form.getByLabel("Bodyweight (kg)").fill(kg);
      await form.getByText("Tape measurements (cm)").click();
      await form.getByLabel("Waist").fill(date.endsWith("28") ? "86" : "85.5");
      await form.getByRole("button", { name: "Save" }).click();
      await expect(form).toBeHidden();
    }

    // 7-day average of 81 and 80 = 80.5.
    await expect(page.getByText("7-day avg", { exact: true }).first().locator("..")).toContainText(
      "80.5 kg",
    );
    const weight = page.getByRole("figure").filter({ hasText: "Bodyweight" });
    await expect(weight.locator(".recharts-surface")).toBeVisible();
    await weight.getByText("Show as table").click();
    await expect(weight.getByRole("table")).toContainText("80.5 kg");
    await expect(
      page.getByRole("figure").filter({ hasText: "Tape" }).locator(".recharts-surface"),
    ).toBeVisible();
  });
});
