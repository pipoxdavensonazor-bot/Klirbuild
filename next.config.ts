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
};

export default nextConfig;

initOpenNextCloudflareForDev();
