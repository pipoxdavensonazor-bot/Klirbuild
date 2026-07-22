"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { apiUrl } from "@/lib/api-client";
import { useSessionStore } from "@/lib/workforce/session";
import { Button } from "@/components/ui/button";

/** Bandeau quand l'admin plateforme est entré dans une entreprise. */
export function PlatformViewingBanner() {
  const isPlatformAdmin = useSessionStore((s) => s.isPlatformAdmin);
  const companyName = useSessionStore((s) => s.companyName);
  const [busy, setBusy] = useState(false);

  if (!isPlatformAdmin || !companyName) return null;

  async function exitTenant() {
    setBusy(true);
    try {
      await fetch(apiUrl("/api/platform/impersonate"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      window.location.href = "/platform";
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Mode admin plateforme — contexte entreprise :{" "}
        <strong>{companyName}</strong>
      </div>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void exitTenant()}>
        Retour console
      </Button>
    </div>
  );
}
