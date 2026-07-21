import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: {
      name: body.name,
      title: body.title,
      slogan: body.slogan,
      bio: body.bio,
      story: body.story,
      experience: body.experience,
      mission: body.mission,
      values: body.values,
      languages: body.languages,
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      ...(body.photoUrl !== undefined
        ? { photoUrl: String(body.photoUrl || "").trim() || profile.photoUrl }
        : {}),
    },
  });

  return NextResponse.json(updated);
}
