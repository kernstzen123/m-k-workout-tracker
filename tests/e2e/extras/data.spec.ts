import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { USERS, expectHome, signIn } from "../fixtures";

const WORKOUTS_CSV = [
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Notes,Workout Notes,RPE",
  "2025-05-05 18:00:00,Legacy Push,1h 2m,Barbell Bench Press,1,70,8,,Old log,8",
  "2025-05-05 18:00:00,Legacy Push,1h 2m,Barbell Bench Press,2,70,7,,Old log,9",
  "2025-05-05 18:00:00,Legacy Push,1h 2m,Moon Press,1,10,10,,Old log,",
  "2025-05-08 18:00:00,Legacy Legs,55,Back Squat,1,90,5,,,",
].join("\n");

test.describe("CSV import & export", () => {
  test("dry-run preview, import, idempotent re-import, then export", async ({ page }) => {
    await signIn(page, USERS.alice.email);
    await expectHome(page, "alice");
    await page.goto("/data");
    // The importer matches exercise names, so it waits for the library to load.
    await expect(page.getByText("Choose a CSV file")).toBeVisible();

    // Dry run: 2 new workouts, 1 invalid row (unknown exercise) — nothing written yet.
    const upload = (name: string, csv: string) =>
      page
        .locator('input[type="file"]')
        .setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(csv) });
    await upload("strong-export.csv", WORKOUTS_CSV);
    const preview = page.getByRole("region", { name: "Import preview" });
    await expect(preview).toContainText("strong-export.csv");
    await expect(preview.getByText("New workouts").locator("..")).toContainText("2");
    await preview.getByText(/can't be imported/).click();
    await expect(preview).toContainText('Line 4: Unknown exercise "Moon Press"');

    await preview.getByRole("button", { name: "Import 2 workouts" }).click();
    await expect(page.getByText("Imported 2 workouts.")).toBeVisible();

    // Re-importing the same file writes nothing new.
    await upload("strong-export.csv", WORKOUTS_CSV);
    await expect(preview.getByRole("button", { name: "Nothing new to import" })).toBeDisabled();
    await expect(preview).toContainText("2 workouts already imported");

    // Imported workouts appear in History with their original dates.
    await page.goto("/history");
    await expect(page.getByRole("link", { name: /Legacy Push/ })).toContainText("Mon 5 May");

    // Export: one row per set, including the imported and the live workouts.
    await page.goto("/data");
    await expect(page.getByRole("button", { name: "Export everything" })).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export workouts" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^mk-workout-workouts-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await readFile((await download.path())!, "utf8");
    expect(csv).toContain("date,started_at,session_id,workout");
    expect(csv).toContain("Legacy Push");
    expect(csv).toContain("Barbell Bench Press");

    // Body import from the template format.
    await page
      .getByRole("group", { name: "What to import" })
      .getByRole("button", { name: "Body" })
      .click();
    await upload(
      "body.csv",
      "date,weight_kg,body_fat_pct,waist_cm\n2025-05-01,82.0,17,88\n2025-05-15,81.2,,87.5\n",
    );
    await preview.getByRole("button", { name: "Import 2 entries" }).click();
    await expect(page.getByText("Imported 2 entries.")).toBeVisible();
  });
});
