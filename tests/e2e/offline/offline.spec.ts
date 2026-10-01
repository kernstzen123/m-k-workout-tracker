import { expect, test, type Page } from "@playwright/test";
import { FIRESTORE_EMULATOR, PROJECT_ID, USERS, expectHome, signIn } from "../fixtures";

/**
 * Acceptance: "a complete workout can be logged in airplane mode and syncs correctly afterwards".
 * Runs against a production build (port 3200) so the real service worker serves the app shell.
 */

interface RestDoc {
  name: string;
  fields: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number }>;
}

async function serverDocs(path: string): Promise<RestDoc[]> {
  const res = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}?pageSize=300`,
    { headers: { Authorization: "Bearer owner" } },
  );
  const json = (await res.json()) as { documents?: RestDoc[] };
  return json.documents ?? [];
}

const idOf = (d: RestDoc) => d.name.split("/").at(-1)!;

async function logSet(page: Page, n: number, weight: string, reps: string) {
  const card = page.getByRole("article", { name: "Barbell Bench Press" });
  await card.getByLabel(`Set ${n} weight in kg`).fill(weight);
  await card.getByLabel(`Set ${n} reps`).fill(reps);
  await card.getByRole("button", { name: `Complete set ${n}` }).click();
  await expect(card.getByRole("button", { name: `Set ${n} done — tap to undo` })).toBeVisible();
  await page.getByRole("button", { name: /Skip rest|Dismiss rest/ }).click();
}

test("a complete workout logged offline syncs when back online", async ({ page, context }) => {
  test.setTimeout(180_000);
  await signIn(page, USERS.bob.email);
  await expectHome(page, "bob");

  // Let the service worker install, precache the app shell and take control.
  const swState = () =>
    page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return JSON.stringify({
        controller: navigator.serviceWorker.controller?.scriptURL ?? null,
        regs: regs.map((r) => ({
          active: r.active?.state ?? null,
          installing: r.installing?.state ?? null,
          waiting: r.waiting?.state ?? null,
        })),
      });
    });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(swState, { message: "service worker should control the page", timeout: 30_000 })
    .toContain('"controller":"http');
  // Visit the workout screen once online so its data is cached too.
  await page.goto("/workout");
  await expect(page.getByRole("button", { name: /^Upper A/ })).toBeVisible();

  const before = new Set((await serverDocs("users/bob/sessions")).map(idOf));

  // ✈ Airplane mode: reload the app from the service worker and log a full workout.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/^Offline/)).toBeVisible();
  await page.getByRole("button", { name: /^Upper A/ }).click();
  await logSet(page, 1, "50", "8");
  await logSet(page, 2, "50", "7");
  await page.getByRole("button", { name: "Finish" }).click();
  await page
    .getByRole("dialog", { name: "Finish workout" })
    .getByLabel("Session note")
    .fill("airplane mode");
  await page
    .getByRole("dialog", { name: "Finish workout" })
    .getByRole("button", { name: "Save workout" })
    .click();
  await expect(page.getByText("Workout saved")).toBeVisible();

  // Nothing has reached the server yet.
  const offlineIds = (await serverDocs("users/bob/sessions"))
    .map(idOf)
    .filter((id) => !before.has(id));
  expect(offlineIds).toEqual([]);

  // Back online: the queued writes sync on their own.
  await context.setOffline(false);
  let newId = "";
  await expect
    .poll(
      async () => {
        const docs = await serverDocs("users/bob/sessions");
        const fresh = docs.find((d) => !before.has(idOf(d)));
        newId = fresh ? idOf(fresh) : "";
        return fresh?.fields.status?.stringValue ?? "missing";
      },
      { timeout: 60_000 },
    )
    .toBe("done");

  const session = (await serverDocs("users/bob/sessions")).find((d) => idOf(d) === newId)!;
  expect(session.fields.notes?.stringValue).toBe("airplane mode");
  const sets = await serverDocs(`users/bob/sessions/${newId}/sets`);
  expect(sets.map((s) => Number(s.fields.reps?.integerValue)).sort()).toEqual([7, 8]);
});
