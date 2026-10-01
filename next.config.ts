import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

const nextConfig: NextConfig = {
  // E2E runs its own dev server in a separate dir so it can run alongside `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: commit ? `${pkg.version} (${commit})` : pkg.version,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
