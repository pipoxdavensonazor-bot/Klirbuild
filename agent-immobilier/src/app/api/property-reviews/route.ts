import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId")?.trim();
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId requis" }, { status: 400 });
  }

  const items = await prisma.testimonial.findMany({
    where: { propertyId, approved: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      role: true,
      content: true,
      rating: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (String(body.website || "").trim()) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const propertyId = String(body.propertyId || "").trim();
    const name = String(body.name || "").trim();
    const content = String(body.content || "").trim();
    const role = String(body.role || "").trim() || null;
    const rating = Math.min(5, Math.max(1, Number(body.rating || 5)));

    if (!propertyId || name.length < 2 || content.length < 10) {
      return NextResponse.json(
        { error: "Nom, avis et propriété sont requis." },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Propriété introuvable." }, { status: 404 });
    }

    await prisma.testimonial.create({
      data: {
        name,
        role,
        content,
        rating,
        propertyId,
        featured: false,
        approved: false,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossible d'enregistrer l'avis." }, { status: 500 });
  }
}
