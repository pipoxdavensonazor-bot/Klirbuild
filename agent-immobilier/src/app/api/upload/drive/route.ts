import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  extractGoogleDriveFileId,
  fetchGoogleDriveFile,
  MAX_UPLOAD_BYTES,
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
    if (file.bytes.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Fichier Drive trop volumineux (max 8 Mo)." },
        { status: 400 }
      );
    }

    const saved = await saveMediaObject({
      bytes: file.bytes,
      contentType: file.contentType,
      fileName: file.fileName,
      source: "drive",
    });

    return NextResponse.json({
      ok: true,
      url: saved.url,
      key: saved.key,
      contentType: saved.meta.contentType,
      size: saved.meta.size,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import Drive impossible";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
