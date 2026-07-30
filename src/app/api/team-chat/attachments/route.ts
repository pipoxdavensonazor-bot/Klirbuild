import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import { publicUploadUrl, putUpload, uploadsEnabled } from "@/lib/storage/blobs";
import { normalizeUploadContentType } from "@/lib/security/upload-security";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function isAllowed(type: string) {
  return ALLOWED_TYPES.has(type);
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!uploadsEnabled()) {
    return NextResponse.json(
      { error: "Upload indisponible (Workers KV non configuré)." },
      { status: 503 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Taille max 25 Mo." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "fichier";
  const ext = safeName.includes(".") ? safeName.split(".").pop() : "bin";
  const key = `team-chat/${session.companyId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const buffer = await file.arrayBuffer();

  const normalized = normalizeUploadContentType({
    declaredType: file.type || "application/octet-stream",
    key,
    bytes: buffer,
    allowed: isAllowed,
  });
  if (!normalized.ok) {
    return NextResponse.json(
      { error: "Formats acceptés : images, PDF, Word, Excel, texte et ZIP." },
      { status: 400 }
    );
  }

  // Prefer declared office types when sniff only sees PK zip.
  let contentType = normalized.contentType;
  const declared = (file.type || "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    contentType === "application/zip" &&
    (declared.includes("officedocument") ||
      declared === "application/msword" ||
      declared === "application/vnd.ms-excel") &&
    isAllowed(declared)
  ) {
    contentType = declared;
  }

  await putUpload(key, buffer, contentType);

  return NextResponse.json({
    attachment: {
      name: safeName,
      mimeType: contentType,
      sizeBytes: file.size,
      storageKey: key,
      url: publicUploadUrl(key, appBaseUrl()),
    },
  });
}
