import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  isAllowedMediaType,
  maxBytesForType,
  saveMediaObject,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "@/lib/media";

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier reçu (champ « file »)." },
        { status: 400 }
      );
    }

    const contentType = (file.type || "application/octet-stream").toLowerCase();
    if (!isAllowedMediaType(contentType)) {
      return NextResponse.json(
        {
          error:
            "Format non supporté. Photos : JPG, PNG, WEBP, GIF. Vidéos : MP4, WEBM, MOV (max 20 Mo).",
        },
        { status: 400 }
      );
    }

    const maxBytes = maxBytesForType(contentType);
    if (file.size > maxBytes) {
      const label = ALLOWED_VIDEO_TYPES.has(contentType) ? "20 Mo" : "8 Mo";
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${label}).` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const saved = await saveMediaObject({
      bytes,
      contentType,
      fileName: file.name,
      source: "upload",
    });

    const kind = ALLOWED_IMAGE_TYPES.has(contentType) ? "image" : "video";

    return NextResponse.json({
      ok: true,
      url: saved.url,
      key: saved.key,
      contentType: saved.meta.contentType,
      size: saved.meta.size,
      kind,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur d'upload";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
