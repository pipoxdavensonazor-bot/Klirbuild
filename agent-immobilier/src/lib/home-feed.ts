import { prisma } from "@/lib/prisma";

export type FeedItemType =
  | "article"
  | "conseil"
  | "evenement"
  | "visite-libre"
  | "annonce";

export type HomeFeedItem = {
  id: string;
  type: FeedItemType;
  badge: string;
  title: string;
  excerpt: string;
  href: string;
  imageUrl?: string | null;
  date: Date;
  meta?: string;
};

const BADGES: Record<FeedItemType, string> = {
  article: "Article",
  conseil: "Conseil",
  evenement: "Événement",
  "visite-libre": "Visite libre",
  annonce: "Annonce",
};

function formatOpenHouseWindow(startsAt: Date, endsAt: Date) {
  const day = startsAt.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const start = startsAt.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = endsAt.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} · ${start} – ${end}`;
}

export async function buildHomeFeed(limit = 12): Promise<HomeFeedItem[]> {
  const now = new Date();

  const [articles, seminars, openHouses, properties] = await Promise.all([
    prisma.article.findMany({
      where: { published: true },
      include: { category: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
    }),
    prisma.seminar.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: limit,
    }),
    prisma.openHouse.findMany({
      where: { published: true, endsAt: { gte: now } },
      include: {
        property: {
          include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        },
      },
      orderBy: { startsAt: "asc" },
      take: limit,
    }),
    prisma.property.findMany({
      where: { status: { in: ["AVAILABLE", "PENDING"] } },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  ]);

  const items: HomeFeedItem[] = [];

  for (const a of articles) {
    const isConseil = a.category?.slug === "conseils";
    const type: FeedItemType = isConseil ? "conseil" : "article";
    items.push({
      id: `article-${a.id}`,
      type,
      badge: BADGES[type],
      title: a.title,
      excerpt: a.excerpt,
      href: `/blog/${a.slug}`,
      imageUrl: a.coverUrl,
      date: a.publishedAt ?? a.createdAt,
      meta: a.category?.name,
    });
  }

  for (const s of seminars) {
    items.push({
      id: `seminar-${s.id}`,
      type: "evenement",
      badge: BADGES.evenement,
      title: s.title,
      excerpt: s.description,
      href: `/seminaires/${s.slug}`,
      imageUrl: s.imageUrl,
      date: s.startsAt,
      meta: s.location,
    });
  }

  for (const oh of openHouses) {
    const p = oh.property;
    items.push({
      id: `openhouse-${oh.id}`,
      type: "visite-libre",
      badge: BADGES["visite-libre"],
      title: `Visite libre — ${p.title}`,
      excerpt:
        oh.notes?.trim() ||
        `Porte ouverte à ${p.address}, ${p.city}. Venez découvrir la propriété sans rendez-vous.`,
      href: `/proprietes/${p.slug}`,
      imageUrl: p.images[0]?.url,
      date: oh.startsAt,
      meta: formatOpenHouseWindow(oh.startsAt, oh.endsAt),
    });
  }

  for (const p of properties) {
    items.push({
      id: `property-${p.id}`,
      type: "annonce",
      badge: BADGES.annonce,
      title: p.title,
      excerpt: `${p.city} · ${p.bedrooms} ch. · ${p.bathrooms} sdb`,
      href: `/proprietes/${p.slug}`,
      imageUrl: p.images[0]?.url,
      date: p.updatedAt,
      meta: new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      }).format(p.price),
    });
  }

  return items
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}
