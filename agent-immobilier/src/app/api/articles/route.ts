import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { slugify } from "@/lib/distribute";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const articles = await prisma.article.findMany({
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(articles);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const slug =
    slugify(String(body.slug || body.title || "")) || `article-${Date.now()}`;

  let categoryId = body.categoryId || null;
  if (!categoryId && body.categorySlug) {
    const cat = await prisma.category.upsert({
      where: { slug: String(body.categorySlug) },
      update: {},
      create: {
        name: String(body.categoryName || body.categorySlug),
        slug: String(body.categorySlug),
      },
    });
    categoryId = cat.id;
  }

  const published = Boolean(body.published);
  const article = await prisma.article.create({
    data: {
      title: body.title,
      slug,
      excerpt: body.excerpt || "",
      content: body.content || "",
      coverUrl: body.coverUrl || null,
      published,
      publishedAt: published ? new Date() : null,
      categoryId,
    },
  });

  return NextResponse.json(article, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.article.findUnique({ where: { id: body.id } });
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const published = Boolean(body.published);
  const article = await prisma.article.update({
    where: { id: body.id },
    data: {
      title: body.title,
      slug: slugify(String(body.slug || body.title || existing.slug)),
      excerpt: body.excerpt ?? existing.excerpt,
      content: body.content ?? existing.content,
      coverUrl: body.coverUrl ?? existing.coverUrl,
      published,
      publishedAt: published
        ? existing.publishedAt || new Date()
        : null,
      categoryId: body.categoryId ?? existing.categoryId,
    },
  });

  return NextResponse.json(article);
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  // SocialPost.articleId n'a pas de relation Prisma — nettoyer à la main
  await prisma.socialPost.deleteMany({ where: { articleId: id } });
  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
