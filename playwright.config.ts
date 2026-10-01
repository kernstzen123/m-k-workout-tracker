import { defineConfig, devices } from "@playwright/test";

// Run via `npm run test:e2e`, which starts the Auth + Firestore emulators around Playwright.
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_USE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-mk-workout",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-mk-workout.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app",
    },
  },
});
