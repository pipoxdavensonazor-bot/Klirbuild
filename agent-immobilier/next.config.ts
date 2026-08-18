import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.leonnebienaime.ca" }],
        destination: "https://leonnebienaime.ca/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "leonnebienaime.ca" },
      { protocol: "https", hostname: "www.leonnebienaime.ca" },
      {
        protocol: "https",
        hostname: "leonnebienaime.pipoxdavensonazor.workers.dev",
      },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "mspublic.centris.ca" },
      { protocol: "https", hostname: "www.centris.ca" },
    ],
  },
};

export default nextConfig;
