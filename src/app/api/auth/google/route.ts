import { NextResponse } from "next/server";
import { googleAuthUrl, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next")?.trim() || "/dashboard";

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      `${appBaseUrl()}/login?error=${encodeURIComponent(
        "Connexion Google non configurée. Utilisez email et mot de passe, ou ajoutez GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET."
      )}&next=${encodeURIComponent(next)}`
    );
  }

  const state = Buffer.from(JSON.stringify({ next })).toString("base64url");
  return NextResponse.redirect(googleAuthUrl(state));
}
