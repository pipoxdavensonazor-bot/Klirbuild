"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        needsTotp
          ? { step: "totp", totp }
          : { password }
      ),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Connexion impossible.");
      return;
    }
    if (data.needsTotp) {
      setNeedsTotp(true);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-6 border border-[#C9A227]/40 bg-white p-8"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
            Connexion
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {needsTotp
              ? "Entrez le code de votre application d’authentification."
              : "Accès pour modifier les textes et ajouter des maisons."}
          </p>
        </div>
        {!needsTotp ? (
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="totp">Code 2FA (6 chiffres)</Label>
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              required
              autoFocus
            />
          </div>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" variant="gold" className="w-full" disabled={pending}>
          {pending ? "Vérification…" : needsTotp ? "Valider le code" : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}
