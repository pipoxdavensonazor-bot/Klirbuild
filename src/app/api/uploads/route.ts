import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import {
  publicUploadUrl,
  putUpload,
  uploadsEnabled,
} from "@/lib/storage/blobs";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!uploadsEnabled()) {
    return NextResponse.json(
      {
        error:
          "Upload disponible sur Netlify uniquement. Collez une URL d'image en alternative.",
      },
      { status: 503 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Format accepté : JPEG, PNG, WebP, GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Taille max 5 Mo." }, { status: 400 });
  }

  const ext = file.type.split("/")[1] ?? "bin";
  const key = `marketing/${session.companyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = await file.arrayBuffer();
  await putUpload(key, buffer, file.type);

  const url = publicUploadUrl(key, appBaseUrl());
  return NextResponse.json({ url, key });
}
