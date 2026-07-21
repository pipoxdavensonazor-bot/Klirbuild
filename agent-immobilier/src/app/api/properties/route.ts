import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { sanitizeRichHtml } from "@/lib/rich-text";

type OpenHousePayload = {
  startsAt?: string;
  endsAt?: string;
  notes?: string;
  published?: boolean;
  clear?: boolean;
};

async function upsertOpenHouse(propertyId: string, oh?: OpenHousePayload) {
  if (!oh) return;
  try {
    if (oh.clear) {
      await prisma.openHouse.deleteMany({ where: { propertyId } });
      return;
    }
    if (!oh.startsAt || !oh.endsAt) return;
    const startsAt = new Date(oh.startsAt);
    const endsAt = new Date(oh.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return;

    const existing = await prisma.openHouse.findFirst({
      where: { propertyId },
      orderBy: { startsAt: "desc" },
    });

    const data = {
      startsAt,
      endsAt,
      notes: oh.notes?.trim() || null,
      published: oh.published !== false,
    };

    if (existing) {
      await prisma.openHouse.update({ where: { id: existing.id }, data });
    } else {
      await prisma.openHouse.create({ data: { propertyId, ...data } });
    }
  } catch {
    // Table OpenHouse absente — ignorer jusqu'à migration D1
  }
}

export async function GET() {
  const properties = await prisma.property
    .findMany({
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        openHouses: { orderBy: { startsAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => []);
  return NextResponse.json(properties);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();
  const slug =
    String(body.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `maison-${Date.now()}`;

  const property = await prisma.property.create({
    data: {
      title: body.title,
      slug,
      description: sanitizeRichHtml(String(body.description || "")),
      address: body.address,
      city: body.city,
      price: Number(body.price),
      type: body.type || "HOUSE",
      bedrooms: Number(body.bedrooms || 0),
      bathrooms: Number(body.bathrooms || 0),
      garage: Boolean(body.garage),
      areaSqft: Number(body.areaSqft || 0),
      status: body.status || "AVAILABLE",
      featured: Boolean(body.featured),
      videoUrl: body.videoUrl ? String(body.videoUrl) : null,
      images: body.imageUrl
        ? {
            create: [
              {
                url: String(body.imageUrl),
                alt: body.title,
                sortOrder: 0,
              },
            ],
          }
        : undefined,
    },
  });
  await upsertOpenHouse(property.id, body.openHouse);
  return NextResponse.json(property, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const property = await prisma.property.update({
    where: { id: body.id },
    data: {
      title: body.title,
      slug: body.slug,
      description:
        body.description !== undefined
          ? sanitizeRichHtml(String(body.description || ""))
          : undefined,
      address: body.address,
      city: body.city,
      price: Number(body.price),
      type: body.type || "HOUSE",
      bedrooms: Number(body.bedrooms || 0),
      bathrooms: Number(body.bathrooms || 0),
      garage: Boolean(body.garage),
      areaSqft: Number(body.areaSqft || 0),
      status: body.status || "AVAILABLE",
      featured: Boolean(body.featured),
      videoUrl: body.videoUrl ? String(body.videoUrl) : null,
    },
  });
  await upsertOpenHouse(property.id, body.openHouse);

  if (body.imageUrl) {
    const existingImage = await prisma.propertyImage.findFirst({
      where: { propertyId: property.id },
      orderBy: { sortOrder: "asc" },
    });
    if (existingImage) {
      await prisma.propertyImage.update({
        where: { id: existingImage.id },
        data: { url: String(body.imageUrl) },
      });
    } else {
      await prisma.propertyImage.create({
        data: {
          propertyId: property.id,
          url: String(body.imageUrl),
          alt: body.title,
          sortOrder: 0,
        },
      });
    }
  }

  return NextResponse.json(property);
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
  try {
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
}
