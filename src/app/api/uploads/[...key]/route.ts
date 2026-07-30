import { NextResponse } from "next/server";
import { getUpload, getUploadMetadata } from "@/lib/storage/blobs";
import { resolveServeHeaders } from "@/lib/security/upload-security";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const { key: parts } = await context.params;
  const key = parts.map(decodeURIComponent).join("/");

  // Path traversal / absolute keys
  if (
    !key ||
    key.includes("..") ||
    key.startsWith("/") ||
    key.includes("\\")
  ) {
    return NextResponse.json({ error: "Clé invalide." }, { status: 400 });
  }

  const data = await getUpload(key);
  if (!data) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
  const meta = await getUploadMetadata(key);
  const { headers } = resolveServeHeaders({
    storedContentType: meta?.contentType,
    key,
    bytes: data,
  });

  return new NextResponse(data, { headers });
}
