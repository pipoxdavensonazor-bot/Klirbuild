import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import {
  publicUploadUrl,
  putUpload,
  uploadsEnabled,
} from "@/lib/storage/blobs";
import {
  MARKETING_UPLOAD_TYPES,
  normalizeUploadContentType,
} from "@/lib/security/upload-security";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

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
          "Upload indisponible (binding Workers KV manquant). Collez une URL d'image en alternative.",
      },
      { status: 503 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Taille max 5 Mo." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const extGuess = (file.type.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "");
  const key = `marketing/${session.companyId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extGuess || "bin"}`;

  const normalized = normalizeUploadContentType({
    declaredType: file.type,
    key,
    bytes: buffer,
    allowed: MARKETING_UPLOAD_TYPES,
  });
  if (!normalized.ok) {
    return NextResponse.json(
      { error: "Format accepté : JPEG, PNG, WebP, GIF." },
      { status: 400 }
    );
  }

  const ext = normalized.contentType.split("/")[1] ?? "bin";
  const finalKey = `marketing/${session.companyId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  await putUpload(finalKey, buffer, normalized.contentType);

  const url = publicUploadUrl(finalKey, appBaseUrl());
  return NextResponse.json({ url, key: finalKey });
}
