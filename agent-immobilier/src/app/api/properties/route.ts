import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type OpenHousePayload = {
  startsAt?: string;
  endsAt?: string;
  notes?: string;
  published?: boolean;
};

async function upsertOpenHouse(propertyId: string, oh?: OpenHousePayload) {
  if (!oh?.startsAt || !oh?.endsAt) return;
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
}

export async function GET() {
  const properties = await prisma.property.findMany({
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      openHouses: { orderBy: { startsAt: "desc" }, take: 3 },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(properties);
}

export async function POST(req: Request) {
  const body = await req.json();
  const property = await prisma.property.create({
    data: {
      title: body.title,
      slug: body.slug,
      description: body.description,
      address: body.address,
      city: body.city,
      price: Number(body.price),
      type: body.type || "HOUSE",
      bedrooms: Number(body.bedrooms || 0),
      bathrooms: Number(body.bathrooms || 0),
      areaSqft: Number(body.areaSqft || 0),
      status: body.status || "AVAILABLE",
      featured: Boolean(body.featured),
    },
  });
  await upsertOpenHouse(property.id, body.openHouse);
  return NextResponse.json(property, { status: 201 });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const property = await prisma.property.update({
    where: { id: body.id },
    data: {
      title: body.title,
      slug: body.slug,
      description: body.description,
      address: body.address,
      city: body.city,
      price: Number(body.price),
      type: body.type || "HOUSE",
      bedrooms: Number(body.bedrooms || 0),
      bathrooms: Number(body.bathrooms || 0),
      areaSqft: Number(body.areaSqft || 0),
      status: body.status || "AVAILABLE",
      featured: Boolean(body.featured),
    },
  });
  await upsertOpenHouse(property.id, body.openHouse);
  return NextResponse.json(property);
}
