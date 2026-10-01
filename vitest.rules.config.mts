import { defineConfig } from "vitest/config";

// Firestore security rules tests — run inside `firebase emulators:exec` (see `npm run test:rules`).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
