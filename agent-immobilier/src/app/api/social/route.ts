import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ensureDefaultSocialAccounts,
  publishArticleShare,
  publishPropertyShare,
} from "@/lib/distribute";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  await ensureDefaultSocialAccounts();
  const [accounts, posts] = await Promise.all([
    prisma.socialAccount.findMany({ orderBy: { platform: "asc" } }),
    prisma.socialPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
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
      label: body.label !== undefined ? String(body.label) : undefined,
    },
  });
  return NextResponse.json(account);
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

  return NextResponse.json({ error: "type invalide" }, { status: 400 });
}
