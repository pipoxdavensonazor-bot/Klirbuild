"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite")?.trim() ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/users/invite/preview?token=${encodeURIComponent(inviteToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.email) {
          setEmail(data.email);
          setCompanyName(data.companyName ?? "");
        }
      })
      .catch(() => {});
  }, [inviteToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !password) {
      setError("Tous les champs sont requis");
      return;
    }
    if (!inviteToken && (!email || !company)) {
      setError("Tous les champs sont requis");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = inviteToken
        ? apiUrl("/api/auth/accept-invite")
        : apiUrl("/api/auth/register");
      const body = inviteToken
        ? { token: inviteToken, name, password }
        : { name, email, companyName: company, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Inscription échouée"
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(26,54,93,0.08),_transparent_42%),linear-gradient(180deg,#f5f6f8,#e8ecf1)] dark:bg-slate-950">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <KlirBuildLogo className="mb-3 h-[64px] w-[176px]" priority />
            <CardTitle>
              {inviteToken ? "Accepter l'invitation" : "Créer votre entreprise"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {inviteToken
                ? companyName
                  ? `Rejoignez ${companyName} sur KlirBuild.`
                  : "Complétez votre profil pour rejoindre l'équipe."
                : "Crée votre entreprise + compte admin. Nécessite une base Postgres en production."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input
                placeholder="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {!inviteToken ? (
                <>
                  <Input
                    placeholder="Email professionnel"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    placeholder="Nom de l'entreprise"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </>
              ) : (
                <Input placeholder="Email" type="email" value={email} disabled />
              )}
              <Input
                placeholder="Mot de passe (8+ caractères)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Création…"
                  : inviteToken
                    ? "Rejoindre l'équipe"
                    : "Inscription"}
              </Button>
            </form>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-brand-600 hover:underline">
                Connexion
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Chargement…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
