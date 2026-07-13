import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import { publicUploadUrl, putUpload, uploadsEnabled } from "@/lib/storage/blobs";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_PREFIXES = ["image/", "text/"];
const ALLOWED_TYPES = new Set([
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
  return ALLOWED_TYPES.has(type) || ALLOWED_PREFIXES.some((prefix) => type.startsWith(prefix));
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!uploadsEnabled()) {
    return NextResponse.json(
      { error: "Upload disponible sur Netlify uniquement." },
      { status: 503 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!isAllowed(mimeType)) {
    return NextResponse.json(
      { error: "Formats acceptés : images, PDF, Word, Excel, texte et ZIP." },
      { status: 400 }
    );
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
  await putUpload(key, buffer, mimeType);

  return NextResponse.json({
    attachment: {
      name: safeName,
      mimeType,
      sizeBytes: file.size,
      storageKey: key,
      url: publicUploadUrl(key, appBaseUrl()),
    },
  });
}
