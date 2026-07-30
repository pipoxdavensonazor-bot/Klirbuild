import { NextResponse } from "next/server";
import { googleAuthUrl, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";
import { createSignedOAuthState } from "@/lib/auth/oauth-state";
import { sanitizeNextPath } from "@/lib/auth/safe-next";

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
  const next = sanitizeNextPath(url.searchParams.get("next"));

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      `${appBaseUrl()}/login?error=${encodeURIComponent(
        "Connexion Google non configurée. Utilisez email et mot de passe, ou ajoutez GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET."
      )}&next=${encodeURIComponent(next)}`
    );
  }

  try {
    const state = createSignedOAuthState(next);
    return NextResponse.redirect(googleAuthUrl(state));
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Impossible de démarrer Google OAuth.";
    return NextResponse.redirect(
      `${appBaseUrl()}/login?error=${encodeURIComponent(msg)}`
    );
  }
}
