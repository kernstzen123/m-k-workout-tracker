import { defineConfig, devices } from "@playwright/test";

// Run via `npm run test:e2e`, which starts the Auth + Firestore emulators around Playwright.
const DEV_PORT = 3100; // dev server: fast feedback for the core + extras flows
const PROD_PORT = 3200; // production build: real service worker for the offline test

const emulatorEnv = {
  NEXT_PUBLIC_USE_EMULATORS: "true",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-mk-workout",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-mk-workout.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app",
};

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
    baseURL: `http://localhost:${DEV_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // Core flows run first on a clean emulator (they assert "first time" states).
    {
      name: "core",
      testIgnore: ["**/extras/**", "**/offline/**"],
      use: { ...devices["Pixel 7"] },
    },
    // Compare + CSV build on the data the core flows created.
    {
      name: "extras",
      testDir: "tests/e2e/extras",
      dependencies: ["core"],
      use: { ...devices["Pixel 7"] },
    },
    // Airplane-mode workout against the production build (service worker active).
    {
      name: "offline",
      testDir: "tests/e2e/offline",
      dependencies: ["extras"],
      use: { ...devices["Pixel 7"], baseURL: `http://localhost:${PROD_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npx next dev -p ${DEV_PORT}`,
      url: `http://localhost:${DEV_PORT}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { NEXT_DIST_DIR: ".next-e2e", ...emulatorEnv },
    },
    {
      command: `npx next build && npx next start -p ${PROD_PORT}`,
      url: `http://localhost:${PROD_PORT}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 400_000,
      env: { NEXT_DIST_DIR: ".next-e2e-prod", ...emulatorEnv },
    },
  ],
});
