import { prisma } from "@/lib/prisma";
import { hasDirectCredentials, postDirect } from "@/lib/social-api";
import { siteName, siteUrl } from "@/lib/utils";

export type ShareTarget = {
  platform: string;
  label: string;
  shareUrl?: string;
  webhookUrl?: string | null;
  accountId?: string;
};

const WEBHOOK_PLATFORMS = new Set(["WEBHOOK", "WEBHOOK_MAKE"]);

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildShareLinks(params: {
  title: string;
  url: string;
  text?: string;
}) {
  const u = encodeURIComponent(params.url);
  const t = encodeURIComponent(params.title);
  const text = encodeURIComponent(params.text || params.title);
  return {
    FACEBOOK: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    LINKEDIN: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    X: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    WHATSAPP: `https://wa.me/?text=${text}%20${u}`,
    TIKTOK: `https://www.tiktok.com/upload?lang=fr`,
    INSTAGRAM: `https://www.instagram.com/`,
  } as const;
}

const DEFAULT_ACCOUNTS = [
  { platform: "FACEBOOK", label: "Facebook", enabled: true },
  { platform: "INSTAGRAM", label: "Instagram", enabled: true },
  { platform: "TIKTOK", label: "TikTok", enabled: true },
  { platform: "LINKEDIN", label: "LinkedIn", enabled: true },
  { platform: "X", label: "X (Twitter)", enabled: true },
  { platform: "WHATSAPP", label: "WhatsApp", enabled: true },
  {
    platform: "WEBHOOK",
    label: "Zapier (webhook auto)",
    enabled: true,
    webhookUrl: "",
  },
  {
    platform: "WEBHOOK_MAKE",
    label: "Make.com (webhook auto)",
    enabled: true,
    webhookUrl: "",
  },
] as const;

function absoluteMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = siteUrl().replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Always include configured webhooks; keep selected social platforms. */
function selectAccounts<T extends { platform: string; webhookUrl: string | null }>(
  accounts: T[],
  platforms?: string[]
): T[] {
  if (!platforms?.length) return accounts;
  return accounts.filter(
    (a) =>
      platforms.includes(a.platform) ||
      (WEBHOOK_PLATFORMS.has(a.platform) && Boolean(a.webhookUrl))
  );
}

type AccountRow = {
  id: string;
  platform: string;
  label: string;
  enabled: boolean;
  webhookUrl: string | null;
  metaJson: string | null;
};

type DispatchResult = {
  platform: string;
  status: string;
  shareUrl?: string;
  caption?: string;
  error?: string;
  externalId?: string;
};

async function dispatchShare(opts: {
  account: AccountRow;
  caption: string;
  body: string;
  url: string;
  title: string;
  imageUrl?: string | null;
  shareUrl?: string;
  needsCaption: boolean;
  webhookPayload: Record<string, unknown>;
  relation: {
    propertyId?: string;
    articleId?: string;
  };
}): Promise<DispatchResult> {
  const {
    account,
    caption,
    body,
    url,
    title,
    imageUrl,
    shareUrl,
    needsCaption,
  } = opts;

  if (WEBHOOK_PLATFORMS.has(account.platform) && account.webhookUrl) {
    const res = await fetch(account.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts.webhookPayload),
    });
    const status = res.ok ? "SENT" : "FAILED";
    await prisma.socialPost.create({
      data: {
        ...opts.relation,
        socialAccountId: account.id,
        platform: account.platform,
        status,
        title,
        body: caption,
        url,
        errorMessage: res.ok ? null : `HTTP ${res.status}`,
        sentAt: res.ok ? new Date() : null,
      },
    });
    return {
      platform: account.platform,
      status,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  }

  if (hasDirectCredentials(account.platform, account.metaJson)) {
    try {
      const posted = await postDirect(account.platform, account.metaJson, {
        caption,
        url,
        imageUrl,
      });
      await prisma.socialPost.create({
        data: {
          ...opts.relation,
          socialAccountId: account.id,
          platform: account.platform,
          status: "SENT",
          title,
          body: caption,
          url,
          externalId: posted.externalId || null,
          sentAt: new Date(),
        },
      });
      return {
        platform: account.platform,
        status: "SENT",
        externalId: posted.externalId,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur API";
      await prisma.socialPost.create({
        data: {
          ...opts.relation,
          socialAccountId: account.id,
          platform: account.platform,
          status: "FAILED",
          title,
          body: caption,
          url,
          errorMessage: msg,
        },
      });
      return { platform: account.platform, status: "FAILED", error: msg };
    }
  }

  await prisma.socialPost.create({
    data: {
      ...opts.relation,
      socialAccountId: account.id,
      platform: account.platform,
      status: "READY",
      title,
      body,
      url: shareUrl || url,
    },
  });
  return {
    platform: account.platform,
    status: "READY",
    shareUrl,
    caption: needsCaption ? caption : caption,
  };
}

export async function ensureDefaultSocialAccounts() {
  for (const account of DEFAULT_ACCOUNTS) {
    const existing = await prisma.socialAccount.findFirst({
      where: { platform: account.platform },
    });
    if (!existing) {
      await prisma.socialAccount.create({
        data: {
          platform: account.platform,
          label: account.label,
          enabled: account.enabled,
          webhookUrl: "webhookUrl" in account ? account.webhookUrl : null,
        },
      });
    } else if (
      WEBHOOK_PLATFORMS.has(account.platform) &&
      existing.label !== account.label
    ) {
      await prisma.socialAccount.update({
        where: { id: existing.id },
        data: { label: account.label },
      });
    }
  }
}

export async function publishArticleShare(opts: {
  articleId: string;
  platforms?: string[];
}) {
  const article = await prisma.article.findUnique({
    where: { id: opts.articleId },
  });
  if (!article) throw new Error("Article introuvable");

  if (!article.published) {
    await prisma.article.update({
      where: { id: article.id },
      data: { published: true, publishedAt: new Date() },
    });
  }

  await ensureDefaultSocialAccounts();
  const accounts = (await prisma.socialAccount.findMany({
    where: { enabled: true },
  })) as AccountRow[];

  const url = `${siteUrl()}/blog/${article.slug}`;
  const body = `${article.excerpt}\n\nLire sur le site de ${siteName()} : ${url}`;
  const links = buildShareLinks({
    title: article.title,
    url,
    text: `${article.title} — ${article.excerpt}`,
  });
  const selected = selectAccounts(accounts, opts.platforms);
  const caption = `${article.title}\n\n${article.excerpt}\n${url}`;
  const imageUrl = absoluteMediaUrl(article.coverUrl);
  const results: DispatchResult[] = [];

  for (const account of selected) {
    const shareUrl =
      links[account.platform as keyof typeof links] || undefined;
    const needsCaption =
      account.platform === "TIKTOK" || account.platform === "INSTAGRAM";
    try {
      results.push(
        await dispatchShare({
          account,
          caption,
          body,
          url,
          title: article.title,
          imageUrl,
          shareUrl,
          needsCaption,
          relation: { articleId: article.id },
          webhookPayload: {
            type: "article",
            title: article.title,
            excerpt: article.excerpt,
            caption,
            message: caption,
            url,
            imageUrl,
            publishedAt: new Date().toISOString(),
            platforms: ["facebook", "instagram", "linkedin"],
          },
        })
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      await prisma.socialPost.create({
        data: {
          articleId: article.id,
          socialAccountId: account.id,
          platform: account.platform,
          status: "FAILED",
          title: article.title,
          body,
          url,
          errorMessage: msg,
        },
      });
      results.push({ platform: account.platform, status: "FAILED", error: msg });
    }
  }

  return { articleId: article.id, url, caption, results };
}

export async function publishPropertyShare(opts: {
  propertyId: string;
  platforms?: string[];
}) {
  const property = await prisma.property.findUnique({
    where: { id: opts.propertyId },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!property) throw new Error("Propriété introuvable");

  await ensureDefaultSocialAccounts();
  const accounts = (await prisma.socialAccount.findMany({
    where: { enabled: true },
  })) as AccountRow[];

  const url = `${siteUrl()}/proprietes/${property.slug}`;
  const title = property.title;
  const priceLabel = `${property.price.toLocaleString("fr-CA")} $`;
  const specs = [
    property.bedrooms ? `${property.bedrooms} ch.` : null,
    property.bathrooms ? `${property.bathrooms} sdb` : null,
    property.areaSqft
      ? `${property.areaSqft.toLocaleString("fr-CA")} pi²`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const body = `${property.city} · ${priceLabel}${specs ? ` · ${specs}` : ""} — ${url}`;
  const links = buildShareLinks({ title, url, text: body });
  const selected = selectAccounts(accounts, opts.platforms);

  const caption = [
    `🏠 À VENDRE — ${title}`,
    "",
    `${property.address}, ${property.city}`,
    `💰 ${priceLabel}${specs ? ` · ${specs}` : ""}`,
    "",
    `👉 ${url}`,
    "",
    `Léonne Bien-Aimé · PROPRIO DIRECT · (514) 574-8712`,
    `#immobilier #${property.city.replace(/[^a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/g, "")} #àvendre #PROPRIODIRECT`,
  ].join("\n");
  const imageUrl = absoluteMediaUrl(property.images[0]?.url);
  const results: DispatchResult[] = [];

  for (const account of selected) {
    const shareUrl = links[account.platform as keyof typeof links];
    const needsCaption =
      account.platform === "TIKTOK" || account.platform === "INSTAGRAM";
    try {
      results.push(
        await dispatchShare({
          account,
          caption,
          body,
          url,
          title,
          imageUrl,
          shareUrl,
          needsCaption,
          relation: { propertyId: property.id },
          webhookPayload: {
            type: "property",
            title,
            address: property.address,
            city: property.city,
            price: property.price,
            priceLabel,
            specs,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            areaSqft: property.areaSqft,
            caption,
            message: caption,
            url,
            imageUrl,
            platforms: ["facebook", "instagram", "linkedin"],
          },
        })
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      await prisma.socialPost.create({
        data: {
          propertyId: property.id,
          socialAccountId: account.id,
          platform: account.platform,
          status: "FAILED",
          title,
          body: caption,
          url,
          errorMessage: msg,
        },
      });
      results.push({ platform: account.platform, status: "FAILED", error: msg });
    }
  }

  return { propertyId: property.id, url, caption, results };
}

export async function publishSeminarShare(opts: {
  seminarId: string;
  platforms?: string[];
}) {
  const seminar = await prisma.seminar.findUnique({
    where: { id: opts.seminarId },
  });
  if (!seminar) throw new Error("Événement introuvable");

  await ensureDefaultSocialAccounts();
  const accounts = (await prisma.socialAccount.findMany({
    where: { enabled: true },
  })) as AccountRow[];

  const url = `${siteUrl()}/seminaires/${seminar.slug}`;
  const title = seminar.title;
  const when = seminar.startsAt.toLocaleString("fr-CA", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const body = `${when} · ${seminar.location} — ${url}`;
  const links = buildShareLinks({ title, url, text: `${title} — ${body}` });
  const selected = selectAccounts(accounts, opts.platforms);

  const plainDesc = seminar.description
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  const caption = [
    `📅 ÉVÉNEMENT — ${title}`,
    "",
    `🗓 ${when}`,
    `📍 ${seminar.location}`,
    plainDesc ? `\n${plainDesc}` : "",
    "",
    `👉 Infos & inscription : ${url}`,
    "",
    `Léonne Bien-Aimé · PROPRIO DIRECT · (514) 574-8712`,
    `#immobilier #événement #séminaire #PROPRIODIRECT`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const imageUrl = absoluteMediaUrl(seminar.imageUrl);
  const results: DispatchResult[] = [];

  for (const account of selected) {
    const shareUrl = links[account.platform as keyof typeof links];
    const needsCaption =
      account.platform === "TIKTOK" || account.platform === "INSTAGRAM";
    try {
      results.push(
        await dispatchShare({
          account,
          caption,
          body,
          url,
          title,
          imageUrl,
          shareUrl,
          needsCaption,
          relation: {},
          webhookPayload: {
            type: "seminar",
            title,
            location: seminar.location,
            startsAt: seminar.startsAt.toISOString(),
            when,
            caption,
            message: caption,
            url,
            imageUrl,
            platforms: ["facebook", "instagram", "linkedin"],
          },
        })
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      await prisma.socialPost.create({
        data: {
          socialAccountId: account.id,
          platform: account.platform,
          status: "FAILED",
          title,
          body: caption,
          url,
          errorMessage: msg,
        },
      });
      results.push({ platform: account.platform, status: "FAILED", error: msg });
    }
  }

  return { seminarId: seminar.id, url, caption, results };
}

export { slugify };
