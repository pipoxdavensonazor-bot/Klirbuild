import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ensureDefaultSocialAccounts,
  publishArticleShare,
  publishPropertyShare,
  publishSeminarShare,
} from "@/lib/distribute";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  await ensureDefaultSocialAccounts();
  const [rawAccounts, posts] = await Promise.all([
    prisma.socialAccount.findMany({ orderBy: { platform: "asc" } }),
    prisma.socialPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const accounts = rawAccounts.map((a) => {
    let metaPreview: Record<string, unknown> | null = null;
    if (a.metaJson) {
      try {
        const parsed = JSON.parse(a.metaJson) as Record<string, unknown>;
        metaPreview = {
          pageId: parsed.pageId || null,
          igUserId: parsed.igUserId || null,
          authorUrn: parsed.authorUrn || null,
          hasToken: Boolean(parsed.accessToken),
        };
      } catch {
        metaPreview = { hasToken: false };
      }
    }
    return {
      id: a.id,
      platform: a.platform,
      label: a.label,
      enabled: a.enabled,
      webhookUrl: a.webhookUrl,
      hasDirectApi: Boolean(a.metaJson),
      metaPreview,
      // metaJson brut non exposé côté GET (évite de fuiter le token)
    };
  });
  return NextResponse.json({ accounts, posts });
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const account = await prisma.socialAccount.update({
    where: { id: body.id },
    data: {
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
      webhookUrl:
        body.webhookUrl !== undefined ? String(body.webhookUrl || "") : undefined,
      metaJson:
        body.metaJson !== undefined
          ? body.metaJson === null || body.metaJson === ""
            ? null
            : String(body.metaJson)
          : undefined,
      label: body.label !== undefined ? String(body.label) : undefined,
    },
  });
  // Ne pas renvoyer le token en clair dans la réponse générique GET —
  // ici on confirme la sauvegarde sans masquer (admin authentifié).
  return NextResponse.json({
    ...account,
    hasDirectApi: Boolean(account.metaJson),
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();

  if (body.type === "article" && body.articleId) {
    const result = await publishArticleShare({
      articleId: body.articleId,
      platforms: body.platforms,
    });
    return NextResponse.json(result);
  }

  if (body.type === "property" && body.propertyId) {
    const result = await publishPropertyShare({
      propertyId: body.propertyId,
      platforms: body.platforms,
    });
    return NextResponse.json(result);
  }

  if (body.type === "seminar" && body.seminarId) {
    const result = await publishSeminarShare({
      seminarId: body.seminarId,
      platforms: body.platforms,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "type invalide" }, { status: 400 });
}
