"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseApiResponse } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("alex@klirline.demo");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Connexion échouée"
        );
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
          <CardHeader>
            <KlirBuildLogo className="mb-3 h-[64px] w-[176px]" priority />
            <CardTitle>Connexion à KlirBuild</CardTitle>
            <p className="text-sm text-muted-foreground">
              Démo : alex@klirline.demo / password — ou tout email @klirline.demo
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
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
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion…" : "Continuer"}
              </Button>
            </form>
            <Button
              variant="outline"
              className="mt-3 w-full"
              type="button"
              onClick={() => {
                window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
              }}
            >
              Continuer avec Google
            </Button>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <Link href="/forgot-password" className="hover:underline">
                Mot de passe oublié
              </Link>
              <Link href="/register" className="hover:underline">
                Créer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
