import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  extractGoogleDriveFileId,
  fetchGoogleDriveFile,
  isAllowedMediaType,
  maxBytesForType,
  saveMediaObject,
} from "@/lib/media";

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const driveUrl = String(body.driveUrl || body.url || "").trim();
    const fileId = extractGoogleDriveFileId(driveUrl);
    if (!fileId) {
      return NextResponse.json(
        {
          error:
            "Lien Google Drive invalide. Exemple : https://drive.google.com/file/d/…/view",
        },
        { status: 400 }
      );
    }

    const file = await fetchGoogleDriveFile(fileId);
    const contentType = file.contentType.toLowerCase();

    // If Drive returned octet-stream, try to infer from request preference
    let finalType = contentType;
    if (finalType === "application/octet-stream") {
      finalType = "image/jpeg";
    }

    if (!isAllowedMediaType(finalType)) {
      return NextResponse.json(
        {
          error:
            "Ce fichier Drive n'est pas une photo/vidéo supportée (JPG, PNG, WEBP, GIF, MP4, WEBM, MOV).",
        },
        { status: 400 }
      );
    }

    if (file.bytes.byteLength > maxBytesForType(finalType)) {
      const label = ALLOWED_VIDEO_TYPES.has(finalType) ? "20 Mo" : "8 Mo";
      return NextResponse.json(
        { error: `Fichier Drive trop volumineux (max ${label}).` },
        { status: 400 }
      );
    }

    const saved = await saveMediaObject({
      bytes: file.bytes,
      contentType: finalType,
      fileName: file.fileName,
      source: "drive",
    });

    const kind = ALLOWED_IMAGE_TYPES.has(finalType) ? "image" : "video";

    return NextResponse.json({
      ok: true,
      url: saved.url,
      key: saved.key,
      contentType: saved.meta.contentType,
      size: saved.meta.size,
      kind,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import Drive impossible";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
