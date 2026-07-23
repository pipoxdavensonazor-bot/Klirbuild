import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KlirBuild by Klirline",
    short_name: "KlirBuild",
    description: "Construction OS pour PME, automatisations, facturation et opérations terrain.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#004F6E",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/klirbuild-app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity", "finance"],
  };
}
