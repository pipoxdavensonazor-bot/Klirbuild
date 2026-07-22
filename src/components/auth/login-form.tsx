"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(26,54,93,0.1),_transparent_42%),linear-gradient(180deg,#f5f6f8,#e8ecf1)] dark:from-slate-950">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <KlirBuildLogo className="mb-3 h-[64px] w-[176px]" priority />
            <CardTitle>
              {requires2fa ? "Vérification 2FA" : "Connexion à KlirBuild"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {requires2fa
                ? "Entrez le code à 6 chiffres de votre application d’authentification."
                : "Connectez-vous avec votre courriel et mot de passe KlirBuild."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              {!requires2fa ? (
                <>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </>
              ) : (
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Code à 6 chiffres"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={8}
                />
              )}
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Connexion…"
                  : requires2fa
                    ? "Valider le code"
                    : "Continuer"}
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
                    className="mt-3 w-full"
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
                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <Link href="/forgot-password" className="hover:underline">
                    Mot de passe oublié
                  </Link>
                  <Link href="/register" className="hover:underline">
                    Créer un compte
                  </Link>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
