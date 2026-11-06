import { NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  isGoogleOAuthConfigured,
  loginOrRegisterGoogleUser,
} from "@/lib/auth/google-oauth";
import { sessionResponse } from "@/lib/auth/auth-service";
import { verifySignedOAuthState } from "@/lib/auth/oauth-state";

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
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const stateRaw = url.searchParams.get("state");

  const state = verifySignedOAuthState(stateRaw);
  if (!state.ok) {
    return NextResponse.redirect(
      `${appBaseUrl()}/login?error=${encodeURIComponent(state.error)}`
    );
  }
  const next = state.payload.next;

  if (error || !code) {
    return NextResponse.redirect(
      `${appBaseUrl()}/login?error=${encodeURIComponent("Connexion Google annulée")}`
    );
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      `${appBaseUrl()}/login?error=${encodeURIComponent("Google OAuth non configuré")}`
    );
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const result = await loginOrRegisterGoogleUser(profile);

    if ("error" in result && result.error) {
      return NextResponse.redirect(
        `${appBaseUrl()}/login?error=${encodeURIComponent(result.error)}`
      );
    }

    const res = await sessionResponse(result.user);
    const location = `${appBaseUrl()}${next}`;
    const redirect = NextResponse.redirect(location);
    const cookie = res.cookies.get("klirline_session");
    if (cookie) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Erreur Google OAuth";
    const msg =
      /column .* does not exist|does not exist in the current database|P2022/i.test(
        raw
      )
        ? "Base de données non à jour (schéma). Contactez le support KlirBuild."
        : raw.length > 180
          ? "Erreur lors de la connexion Google. Réessayez."
          : raw;
    return NextResponse.redirect(
      `${appBaseUrl()}/login?error=${encodeURIComponent(msg)}`
    );
  }
}
