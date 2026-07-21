import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  saveMediaObject,
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

    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Format non supporté. Utilisez JPG, PNG, WEBP ou GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 8 Mo). Compressez l'image." },
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

    return NextResponse.json({
      ok: true,
      url: saved.url,
      key: saved.key,
      contentType: saved.meta.contentType,
      size: saved.meta.size,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur d'upload";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
