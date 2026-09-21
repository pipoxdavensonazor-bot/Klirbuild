import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim() || "Demande de contact";
    const messageBody = String(body.body || body.message || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const propertyId = body.propertyId ? String(body.propertyId) : null;

    if (!name || !email || !messageBody) {
      return NextResponse.json(
        { error: "Nom, courriel et message sont requis." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Courriel invalide." }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        name,
        email,
        phone,
        subject,
        body: messageBody,
        propertyId,
        read: false,
      },
    });

    return NextResponse.json({ ok: true, id: message.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const updated = await prisma.message.update({
    where: { id: body.id },
    data: { read: body.read !== false },
  });
  return NextResponse.json(updated);
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
  await prisma.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
