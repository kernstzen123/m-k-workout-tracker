import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Revision for precached pages: the deployed commit (Vercel), else local git HEAD, else random.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

// Every route is static, so the whole app shell can be precached for offline use.
const APP_ROUTES = [
  "/",
  "/login",
  "/workout",
  "/history",
  "/history/session",
  "/progress",
  "/more",
  "/program",
  "/exercises",
  "/cardio",
  "/body",
  "/compare",
  "/settings",
  "/data",
  "/~offline",
];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    additionalPrecacheEntries: APP_ROUTES.map((url) => ({ url, revision })),
    swSrc: "src/sw.ts",
    // Source maps are for debugging only — never download them to phones.
    manifestTransforms: [
      (entries) => ({ manifest: entries.filter((e) => !e.url.endsWith(".map")), warnings: [] }),
    ],
    useNativeEsbuild: true,
  },
);
