import { NextResponse } from "next/server";
import { readMediaObject } from "@/lib/media";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string }> }
) {
  const { key: raw } = await ctx.params;
  const key = decodeURIComponent(raw || "").trim();
  if (!key || key.includes("..") || key.includes("/")) {
    return NextResponse.json({ error: "Clé invalide" }, { status: 400 });
  }

  const media = await readMediaObject(key);
  if (!media) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return new NextResponse(media.bytes, {
    status: 200,
    headers: {
      "Content-Type": media.meta.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": media.meta.fileName
        ? `inline; filename="${media.meta.fileName.replace(/"/g, "")}"`
        : "inline",
    },
  });
}
