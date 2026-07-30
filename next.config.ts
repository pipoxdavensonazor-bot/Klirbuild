import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // OpenNext needs both packages external so the workerd export condition
  // resolves to Prisma's wasm.js (not the Node fs.readFileSync engine).
  // See https://opennext.js.org/cloudflare/howtos/db
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
  // Ensure query_compiler_bg.wasm is traced into the Worker bundle
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/.prisma/client/*.wasm",
      "./node_modules/.prisma/client/*.mjs",
      "./node_modules/@prisma/client/**/*.wasm",
    ],
  },
  // Standalone only for Docker (App Runner). Cloudflare OpenNext uses default .next output.
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" as const } : {}),
  async headers() {
    // CSP is applied dynamically in middleware (env-aware). Baseline headers here
    // cover responses that skip middleware (static assets).
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
