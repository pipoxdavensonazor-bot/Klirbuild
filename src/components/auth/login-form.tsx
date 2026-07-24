"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { apiUrl, networkErrorMessage, parseApiResponse } from "@/lib/api-client";

function isNativeShell() {
  if (typeof window === "undefined") return false;
  const cap = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [nativeApp, setNativeApp] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

  useEffect(() => {
    setNativeApp(isNativeShell());
    fetch(apiUrl("/api/health"))
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(Boolean(d?.checks?.googleOAuth?.ok)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (requires2fa) {
        const res = await fetch(apiUrl("/api/auth/2fa/verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code }),
        });
        const data = await parseApiResponse(res);
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Code invalide");
          return;
        }
        router.push(next);
        router.refresh();
        return;
      }

      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Connexion échouée"
        );
        return;
      }
      if (data.requires2fa) {
        setRequires2fa(true);
        setError("");
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(networkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle = {
    color: "#000000",
    WebkitTextFillColor: "#000000",
    caretColor: "#000000",
    backgroundColor: "#ffffff",
  } as const;

  return (
    <div className="login-shell flex flex-col bg-[#0A1C31] text-white">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Desktop welcome panel */}
        <section className="relative hidden min-h-screen items-center overflow-hidden bg-[#0A1C31] lg:flex">
          <div className="login-floorplan-bg pointer-events-none absolute inset-0" aria-hidden>
            <Image
              src="/login/floor-plan.png"
              alt=""
              fill
              priority
              sizes="50vw"
              className="object-cover object-center opacity-40"
            />
          </div>
          <div className="relative z-10 w-full space-y-4 px-12 py-16">
            <p className="login-welcome-enter font-[family-name:var(--font-login-display)] text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              Construction OS
            </p>
            <div className="login-welcome-enter">
              <KlirBuildLogo className="h-[64px] w-[176px] border border-[#D4AF37]/35 bg-white shadow-soft" priority />
            </div>
            <h1 className="login-welcome-enter-delay max-w-lg font-[family-name:var(--font-login-display)] text-[2.75rem] font-semibold leading-tight tracking-tight text-white">
              Bienvenue sur le chantier numérique
            </h1>
            <p className="login-welcome-enter-delay max-w-lg text-base leading-relaxed text-white">
              KlirBuild est conçu pour les entreprises de construction —
              chantiers, équipes, devis, paie et suivi, au même endroit.
            </p>
          </div>
        </section>

        {/* Form — fullscreen on mobile */}
        <section className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden bg-[#0F2744] px-4 py-6 sm:px-8 lg:min-h-screen lg:px-14 lg:py-10">
          <div className="login-floorplan-bg pointer-events-none absolute inset-0 lg:hidden" aria-hidden>
            <Image
              src="/login/floor-plan.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-30"
            />
          </div>

          <div className="login-form-enter relative z-10 mx-auto w-full max-w-md rounded-xl border border-[#D4AF37]/25 bg-[#132A4A]/95 p-5 backdrop-blur-sm sm:p-8 lg:bg-[#132A4A]">
            <div className="mb-5 space-y-2 text-center lg:mb-6 lg:text-left">
              <p className="font-[family-name:var(--font-login-display)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37] lg:hidden">
                Construction OS
              </p>
              <div className="flex justify-center lg:hidden">
                <KlirBuildLogo className="h-[48px] w-[132px] border border-[#D4AF37]/35 bg-white sm:h-[52px] sm:w-[144px]" priority />
              </div>
              <h1 className="font-[family-name:var(--font-login-display)] text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl lg:hidden">
                Bienvenue sur le chantier numérique
              </h1>
              <h2 className="hidden font-[family-name:var(--font-login-display)] text-2xl font-semibold tracking-tight text-white lg:block">
                {requires2fa ? "Vérification 2FA" : "Connexion"}
              </h2>
              <p className="text-sm text-white/85">
                {requires2fa
                  ? "Entrez le code à 6 chiffres de votre application d’authentification."
                  : "Accédez à votre espace chantier KlirBuild."}
              </p>
            </div>

            <form onSubmit={onSubmit} className="login-form-fields space-y-3">
              {!requires2fa ? (
                <>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    enterKeyHint="next"
                    className="login-field"
                    style={fieldStyle}
                  />
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    enterKeyHint="go"
                    className="login-field"
                    style={fieldStyle}
                  />
                </>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Code à 6 chiffres"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={8}
                  enterKeyHint="go"
                  className="login-field"
                  style={fieldStyle}
                />
              )}
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
                {loading
                  ? "Connexion…"
                  : requires2fa
                    ? "Valider le code"
                    : "Connexion"}
              </Button>
              {requires2fa ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setRequires2fa(false);
                    setCode("");
                    setError("");
                  }}
                >
                  Retour
                </Button>
              ) : null}
            </form>

            {!requires2fa ? (
              <>
                {googleEnabled ? (
                  <Button
                    variant="outline"
                    className="mt-3 h-12 w-full border-[#D4AF37]/40 bg-transparent text-white hover:bg-[#0A1C31] hover:text-white"
                    type="button"
                    onClick={() => {
                      window.location.href = apiUrl(
                        `/api/auth/google?next=${encodeURIComponent(next)}`
                      );
                    }}
                  >
                    Continuer avec Google
                  </Button>
                ) : null}
                <div className="mt-4 flex justify-between gap-3 text-xs text-white/80">
                  <Link href="/forgot-password" className="hover:text-white hover:underline">
                    Mot de passe oublié
                  </Link>
                  <Link href="/register" className="hover:text-white hover:underline">
                    Créer un compte
                  </Link>
                </div>
                {!nativeApp ? (
                  <div className="mt-5 space-y-2 border-t border-white/15 pt-4 lg:mt-6 lg:pt-5">
                    <p className="text-center text-xs font-medium text-white">
                      Installer l’application
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="/downloads/KlirBuild-setup.exe"
                        download="KlirBuild-setup.exe"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-[#D4AF37]/40 bg-[#0A1C31] px-2 text-center text-xs font-medium text-white hover:border-[#D4AF37] hover:bg-[#06101C]"
                      >
                        Windows (.exe)
                      </a>
                      <a
                        href="/downloads/KlirBuild-release.apk"
                        download="KlirBuild-release.apk"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-[#D4AF37]/40 bg-[#0A1C31] px-2 text-center text-xs font-medium text-white hover:border-[#D4AF37] hover:bg-[#06101C]"
                      >
                        Android (APK)
                      </a>
                    </div>
                    <p className="text-center text-xs text-white/75">
                      <Link href="/download" className="font-medium text-[#D4AF37] hover:underline">
                        Toutes les versions
                      </Link>
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      </div>
      <AppFooter className="login-footer-compact shrink-0" />
    </div>
  );
}
