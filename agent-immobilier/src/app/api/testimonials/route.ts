import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const items = await prisma.testimonial.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();
  const item = await prisma.testimonial.create({
    data: {
      name: String(body.name || "").trim(),
      role: body.role ? String(body.role) : null,
      content: String(body.content || "").trim(),
      rating: Math.min(5, Math.max(1, Number(body.rating || 5))),
      featured: Boolean(body.featured),
      approved: Boolean(body.approved ?? true),
      photoUrl: body.photoUrl ? String(body.photoUrl) : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const item = await prisma.testimonial.update({
    where: { id: body.id },
    data: {
      name: body.name,
      role: body.role ?? null,
      content: body.content,
      rating: Math.min(5, Math.max(1, Number(body.rating || 5))),
      featured: Boolean(body.featured),
      approved: Boolean(body.approved),
      photoUrl: body.photoUrl ?? null,
    },
  });
  return NextResponse.json(item);
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
  await prisma.testimonial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
