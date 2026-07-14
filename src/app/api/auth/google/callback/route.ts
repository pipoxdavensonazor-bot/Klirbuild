import { NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  isGoogleOAuthConfigured,
  loginOrRegisterGoogleUser,
} from "@/lib/auth/google-oauth";
import { sessionResponse } from "@/lib/auth/auth-service";

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

  let next = "/dashboard";
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64url").toString()) as {
        next?: string;
      };
      if (parsed.next?.startsWith("/")) next = parsed.next;
    } catch {
      /* default */
    }
  }

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
    const msg = err instanceof Error ? err.message : "Erreur Google OAuth";
    return NextResponse.redirect(`${appBaseUrl()}/login?error=${encodeURIComponent(msg)}`);
  }
}
