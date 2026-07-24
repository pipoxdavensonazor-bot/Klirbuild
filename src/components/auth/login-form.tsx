"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { apiUrl, parseApiResponse } from "@/lib/api-client";

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

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

  useEffect(() => {
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
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A1C31] text-white">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Bienvenue — plan en fond plein écran, transparent sous le texte */}
        <section className="relative flex min-h-[52vh] items-center overflow-hidden bg-[#0A1C31] lg:min-h-screen">
          <div className="login-floorplan-bg pointer-events-none absolute inset-0" aria-hidden>
            <Image
              src="/login/floor-plan.png"
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center opacity-40"
            />
          </div>
          <div className="relative z-10 w-full space-y-4 px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
            <p className="login-welcome-enter font-[family-name:var(--font-login-display)] text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              Construction OS
            </p>
            <div className="login-welcome-enter">
              <KlirBuildLogo className="h-[56px] w-[156px] border border-[#D4AF37]/35 bg-white shadow-soft sm:h-[64px] sm:w-[176px]" priority />
            </div>
            <h1 className="login-welcome-enter-delay max-w-lg font-[family-name:var(--font-login-display)] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
              Bienvenue sur le chantier numérique
            </h1>
            <p className="login-welcome-enter-delay max-w-lg text-sm leading-relaxed text-white sm:text-base">
              KlirBuild est conçu pour les entreprises de construction —
              chantiers, équipes, devis, paie et suivi, au même endroit.
            </p>
          </div>
        </section>

        {/* Formulaire */}
        <section className="relative flex flex-col justify-center bg-[#0F2744] px-4 py-10 sm:px-8 lg:px-14">
          <div className="login-form-enter mx-auto w-full max-w-md rounded-xl border border-[#D4AF37]/25 bg-[#132A4A] p-6 sm:p-8">
            <div className="mb-6 lg:hidden">
              <KlirBuildLogo className="mx-auto h-[52px] w-[144px]" priority />
            </div>
            <h2 className="font-[family-name:var(--font-login-display)] text-2xl font-semibold tracking-tight text-white">
              {requires2fa ? "Vérification 2FA" : "Connexion"}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              {requires2fa
                ? "Entrez le code à 6 chiffres de votre application d’authentification."
                : "Accédez à votre espace chantier KlirBuild."}
            </p>

            <form onSubmit={onSubmit} className="login-form-fields mt-6 space-y-3">
              {!requires2fa ? (
                <>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="login-field"
                    style={{
                      color: "#000000",
                      WebkitTextFillColor: "#000000",
                      caretColor: "#000000",
                      backgroundColor: "#ffffff",
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="login-field"
                    style={{
                      color: "#000000",
                      WebkitTextFillColor: "#000000",
                      caretColor: "#000000",
                      backgroundColor: "#ffffff",
                    }}
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
                  className="login-field"
                  style={{
                    color: "#000000",
                    WebkitTextFillColor: "#000000",
                    caretColor: "#000000",
                    backgroundColor: "#ffffff",
                  }}
                />
              )}
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading
                  ? "Connexion…"
                  : requires2fa
                    ? "Valider le code"
                    : "Entrer sur le chantier"}
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
                    className="mt-3 h-11 w-full border-[#D4AF37]/40 bg-transparent text-white hover:bg-[#0A1C31] hover:text-white"
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
                <div className="mt-4 flex justify-between text-xs text-white/80">
                  <Link href="/forgot-password" className="hover:text-white hover:underline">
                    Mot de passe oublié
                  </Link>
                  <Link href="/register" className="hover:text-white hover:underline">
                    Créer un compte
                  </Link>
                </div>
                <div className="mt-6 space-y-2 border-t border-white/15 pt-5">
                  <p className="text-center text-xs font-medium text-white">
                    Installer l’application
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/downloads/KlirBuild-setup.exe"
                      download="KlirBuild-setup.exe"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#D4AF37]/40 bg-[#0A1C31] px-2 text-center text-xs font-medium text-white hover:border-[#D4AF37] hover:bg-[#06101C]"
                    >
                      Windows (.exe)
                    </a>
                    <a
                      href="/downloads/KlirBuild-release.apk"
                      download="KlirBuild-release.apk"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#D4AF37]/40 bg-[#0A1C31] px-2 text-center text-xs font-medium text-white hover:border-[#D4AF37] hover:bg-[#06101C]"
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
              </>
            ) : null}
          </div>
        </section>
      </div>
      <AppFooter />
    </div>
  );
}
