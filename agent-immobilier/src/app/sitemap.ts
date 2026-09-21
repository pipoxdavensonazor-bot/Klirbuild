import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/proprietes",
    "/a-propos",
    "/blog",
    "/seminaires",
    "/contact",
    "/mentions-legales",
    "/politique-confidentialite",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const [properties, articles, seminars] = await Promise.all([
    prisma.property
      .findMany({
        where: { status: { in: ["AVAILABLE", "PENDING", "SOLD"] } },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.article
      .findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.seminar
      .findMany({ select: { slug: true, updatedAt: true } })
      .catch(() => []),
  ]);

  return [
    ...staticRoutes,
    ...properties.map((p) => ({
      url: `${base}/proprietes/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...articles.map((a) => ({
      url: `${base}/blog/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...seminars.map((s) => ({
      url: `${base}/seminaires/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
