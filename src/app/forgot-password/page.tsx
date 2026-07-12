"use client";

import { useState } from "react";
import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setMessage(data.message ?? "Courriel envoyé si le compte existe.");
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(26,54,93,0.08),_transparent_42%),linear-gradient(180deg,#f5f6f8,#e8ecf1)] dark:bg-slate-950">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <KlirBuildLogo className="mb-3 h-[64px] w-[176px]" priority />
            <CardTitle>Mot de passe oublié</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <Input
                type="email"
                placeholder="Courriel"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <Button className="w-full" disabled={busy}>
                {busy ? "Envoi…" : "Envoyer le lien"}
              </Button>
              <Link
                href="/login"
                className="block text-center text-xs text-brand-600 hover:underline"
              >
                Retour connexion
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
