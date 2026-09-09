import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { slugify } from "@/lib/distribute";
import { sanitizeRichHtml } from "@/lib/rich-text";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const seminars = await prisma.seminar.findMany({
    orderBy: { startsAt: "desc" },
  });
  return NextResponse.json(seminars);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }

  const slug =
    slugify(String(body.slug || title)) || `evenement-${Date.now()}`;

  const seminar = await prisma.seminar.create({
    data: {
      title,
      slug,
      description: sanitizeRichHtml(String(body.description || "")),
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      startsAt,
      location: String(body.location || ""),
      mapEmbedUrl: body.mapEmbedUrl ? String(body.mapEmbedUrl) : null,
      capacity: Number(body.capacity || 50),
      registrationOpen: body.registrationOpen !== false,
    },
  });

  return NextResponse.json(seminar, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.seminar.findUnique({ where: { id: body.id } });
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const startsAt = body.startsAt
    ? new Date(body.startsAt)
    : existing.startsAt;
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }

  const seminar = await prisma.seminar.update({
    where: { id: body.id },
    data: {
      title: body.title ?? existing.title,
      slug: slugify(String(body.slug || body.title || existing.slug)),
      description:
        body.description !== undefined
          ? sanitizeRichHtml(String(body.description || ""))
          : existing.description,
      imageUrl:
        body.imageUrl === undefined
          ? existing.imageUrl
          : body.imageUrl
            ? String(body.imageUrl)
            : null,
      startsAt,
      location: body.location ?? existing.location,
      mapEmbedUrl:
        body.mapEmbedUrl === undefined
          ? existing.mapEmbedUrl
          : body.mapEmbedUrl
            ? String(body.mapEmbedUrl)
            : null,
      capacity:
        body.capacity === undefined
          ? existing.capacity
          : Number(body.capacity),
      registrationOpen:
        body.registrationOpen === undefined
          ? existing.registrationOpen
          : Boolean(body.registrationOpen),
    },
  });

  return NextResponse.json(seminar);
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

  const existing = await prisma.seminar.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  // registrations cascade via Prisma schema
  await prisma.seminar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
