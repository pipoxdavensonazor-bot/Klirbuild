import { NextResponse } from "next/server";
import { readMediaObject } from "@/lib/media";
import { isAllowedMediaEmbed, verifyMediaSignature } from "@/lib/media-access";
import { sessionTokenMatches } from "@/lib/admin-session";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ key: string }> }
) {
  const { key: raw } = await ctx.params;
  const key = decodeURIComponent(raw || "").trim();
  if (!key || key.includes("..") || key.includes("/")) {
    return NextResponse.json({ error: "Clé invalide" }, { status: 400 });
  }

  const url = new URL(req.url);
  const signed = await verifyMediaSignature(
    key,
    url.searchParams.get("exp"),
    url.searchParams.get("sig")
  );

  const cookieHeader = req.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(
    /(?:^|;\s*)leonne_admin_session=([^;]+)/
  );
  const isAdmin = sessionMatch
    ? await sessionTokenMatches(decodeURIComponent(sessionMatch[1]))
    : false;

  if (!signed && !isAdmin && !isAllowedMediaEmbed(req)) {
    return NextResponse.json(
      { error: "Accès média refusé" },
      { status: 403 }
    );
  }

  const media = await readMediaObject(key);
  if (!media) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(media.bytes), {
    status: 200,
    headers: {
      "Content-Type": media.meta.contentType || "application/octet-stream",
      "Cache-Control": signed
        ? "public, max-age=31536000, immutable"
        : "private, max-age=3600",
      "Content-Disposition": media.meta.fileName
        ? `inline; filename="${media.meta.fileName.replace(/"/g, "")}"`
        : "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
