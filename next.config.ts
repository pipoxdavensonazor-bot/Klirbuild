import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // OpenNext patches Prisma for Workers — keep client external to the bundler
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg", "pg"],
  // Standalone only for Docker (App Runner). Cloudflare OpenNext uses default .next output.
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" as const } : {}),
};

export default nextConfig;

initOpenNextCloudflareForDev();
