import { prisma } from "@/lib/prisma";
import { siteName, siteUrl } from "@/lib/utils";

export type ShareTarget = {
  platform: string;
  label: string;
  shareUrl?: string;
  webhookUrl?: string | null;
  accountId?: string;
};

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
  } as const;
}

export async function ensureDefaultSocialAccounts() {
  const count = await prisma.socialAccount.count();
  if (count > 0) return;

  await prisma.socialAccount.createMany({
    data: [
      { platform: "FACEBOOK", label: "Facebook", enabled: true },
      { platform: "INSTAGRAM", label: "Instagram", enabled: true },
      { platform: "LINKEDIN", label: "LinkedIn", enabled: true },
      { platform: "X", label: "X (Twitter)", enabled: true },
      { platform: "WHATSAPP", label: "WhatsApp", enabled: true },
      {
        platform: "WEBHOOK",
        label: "Zapier / Make (webhook)",
        enabled: false,
        webhookUrl: "",
      },
    ],
  });
}

export async function publishArticleShare(opts: {
  articleId: string;
  platforms?: string[];
}) {
  const article = await prisma.article.findUnique({
    where: { id: opts.articleId },
  });
  if (!article) throw new Error("Article introuvable");

  // Publish on site if not already
  if (!article.published) {
    await prisma.article.update({
      where: { id: article.id },
      data: { published: true, publishedAt: new Date() },
    });
  }

  await ensureDefaultSocialAccounts();
  const accounts = await prisma.socialAccount.findMany({
    where: { enabled: true },
  });

  const url = `${siteUrl()}/blog/${article.slug}`;
  const body = `${article.excerpt}\n\nLire sur le site de ${siteName()} : ${url}`;
  const links = buildShareLinks({
    title: article.title,
    url,
    text: `${article.title} — ${article.excerpt}`,
  });

  const selected = opts.platforms?.length
    ? accounts.filter((a) => opts.platforms!.includes(a.platform))
    : accounts;

  const results: Array<{
    platform: string;
    status: string;
    shareUrl?: string;
    error?: string;
  }> = [];

  for (const account of selected) {
    const shareUrl =
      links[account.platform as keyof typeof links] || undefined;

    try {
      if (account.platform === "WEBHOOK" && account.webhookUrl) {
        const res = await fetch(account.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "article",
            title: article.title,
            excerpt: article.excerpt,
            url,
            coverUrl: article.coverUrl,
            publishedAt: new Date().toISOString(),
          }),
        });
        const status = res.ok ? "SENT" : "FAILED";
        await prisma.socialPost.create({
          data: {
            articleId: article.id,
            socialAccountId: account.id,
            platform: account.platform,
            status,
            title: article.title,
            body,
            url,
            errorMessage: res.ok ? null : `HTTP ${res.status}`,
            sentAt: res.ok ? new Date() : null,
          },
        });
        results.push({
          platform: account.platform,
          status,
          error: res.ok ? undefined : `HTTP ${res.status}`,
        });
      } else {
        await prisma.socialPost.create({
          data: {
            articleId: article.id,
            socialAccountId: account.id,
            platform: account.platform,
            status: "READY",
            title: article.title,
            body,
            url: shareUrl || url,
            sentAt: null,
          },
        });
        results.push({
          platform: account.platform,
          status: "READY",
          shareUrl,
        });
      }
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

  return { articleId: article.id, url, results };
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
  const accounts = await prisma.socialAccount.findMany({
    where: { enabled: true },
  });

  const url = `${siteUrl()}/proprietes/${property.slug}`;
  const title = property.title;
  const body = `${property.city} · ${property.price.toLocaleString("fr-CA")} $ — ${url}`;
  const links = buildShareLinks({ title, url, text: body });

  const selected = opts.platforms?.length
    ? accounts.filter((a) => opts.platforms!.includes(a.platform))
    : accounts;

  const results = [];
  for (const account of selected) {
    const shareUrl = links[account.platform as keyof typeof links];
    if (account.platform === "WEBHOOK" && account.webhookUrl) {
      const res = await fetch(account.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "property",
          title,
          city: property.city,
          price: property.price,
          url,
          imageUrl: property.images[0]?.url,
        }),
      });
      await prisma.socialPost.create({
        data: {
          propertyId: property.id,
          socialAccountId: account.id,
          platform: account.platform,
          status: res.ok ? "SENT" : "FAILED",
          title,
          body,
          url,
          errorMessage: res.ok ? null : `HTTP ${res.status}`,
          sentAt: res.ok ? new Date() : null,
        },
      });
      results.push({
        platform: account.platform,
        status: res.ok ? "SENT" : "FAILED",
      });
    } else {
      await prisma.socialPost.create({
        data: {
          propertyId: property.id,
          socialAccountId: account.id,
          platform: account.platform,
          status: "READY",
          title,
          body,
          url: shareUrl || url,
        },
      });
      results.push({ platform: account.platform, status: "READY", shareUrl });
    }
  }

  return { propertyId: property.id, url, results };
}

export { slugify };
