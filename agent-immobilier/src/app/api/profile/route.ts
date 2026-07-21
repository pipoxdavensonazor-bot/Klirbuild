import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { sanitizeRichHtml } from "@/lib/rich-text";

const RICH_KEYS = [
  "slogan",
  "bio",
  "story",
  "experience",
  "degrees",
  "certifications",
  "awards",
  "mission",
  "values",
  "languages",
] as const;

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const rich: Partial<Record<(typeof RICH_KEYS)[number], string>> = {};
  for (const key of RICH_KEYS) {
    if (body[key] !== undefined) {
      rich[key] = sanitizeRichHtml(String(body[key] || ""));
    }
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: {
      name: body.name,
      title: body.title,
      slogan: rich.slogan ?? body.slogan,
      bio: rich.bio ?? body.bio,
      story: rich.story ?? body.story,
      experience: rich.experience ?? body.experience,
      degrees: rich.degrees ?? body.degrees,
      certifications: rich.certifications ?? body.certifications,
      awards: rich.awards ?? body.awards,
      mission: rich.mission ?? body.mission,
      values: rich.values ?? body.values,
      languages: rich.languages ?? body.languages,
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      whatsapp: body.whatsapp !== undefined ? String(body.whatsapp || "") : undefined,
      facebook: body.facebook !== undefined ? String(body.facebook || "") || null : undefined,
      instagram:
        body.instagram !== undefined ? String(body.instagram || "") || null : undefined,
      linkedin: body.linkedin !== undefined ? String(body.linkedin || "") || null : undefined,
      ...(body.photoUrl !== undefined
        ? { photoUrl: String(body.photoUrl || "").trim() || profile.photoUrl }
        : {}),
    },
  });

  return NextResponse.json(updated);
}
