import { NextResponse } from "next/server";
import { getUpload, getUploadMetadata } from "@/lib/storage/blobs";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const { key: parts } = await context.params;
  const key = parts.map(decodeURIComponent).join("/");
  const data = await getUpload(key);
  if (!data) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
  const meta = await getUploadMetadata(key);
  const contentType = meta?.contentType ?? "application/octet-stream";
  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
