"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { roleLabelFr } from "@/lib/workforce/roles";

function InviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [preview, setPreview] = useState<{
    email: string;
    role: string;
    companyName: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    void fetch(apiUrl(`/api/users/invite/preview?token=${encodeURIComponent(token)}`))
      .then((r) => r.json())
      .then((data) => {
        if (data.email) setPreview(data);
        else setError(data.error ?? "Invitation invalide");
      })
      .catch(() => setError("Erreur réseau"));
  }, [token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/auth/accept-invite"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-red-700">Token d&apos;invitation manquant.</p>;
  }

  if (!preview && !error) {
    return <p className="text-sm text-muted-foreground">Vérification…</p>;
  }

  if (error && !preview) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  return (
    <form onSubmit={(e) => void accept(e)} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {preview?.companyName} · {preview?.email} · {roleLabelFr(preview?.role as never)}
      </p>
      <Input
        placeholder="Votre nom"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Mot de passe (8+)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button className="w-full" disabled={busy}>
        {busy ? "…" : "Accepter l'invitation"}
      </Button>
    </form>
  );
}

export default function InvitePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(26,54,93,0.08),_transparent_42%),linear-gradient(180deg,#f5f6f8,#e8ecf1)] dark:bg-slate-950">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <KlirBuildLogo className="mb-3 h-[80px] w-[220px]" priority />
            <CardTitle>Invitation équipe</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <InviteInner />
            </Suspense>
            <Link
              href="/login"
              className="mt-4 block text-center text-xs text-brand-600 hover:underline"
            >
              Déjà un compte ? Connexion
            </Link>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
