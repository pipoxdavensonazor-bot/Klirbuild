import { NextResponse } from "next/server";
import { googleAuthUrl, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET requis." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next")?.trim() || "/dashboard";
  const state = Buffer.from(JSON.stringify({ next })).toString("base64url");

  return NextResponse.redirect(googleAuthUrl(state));
}
