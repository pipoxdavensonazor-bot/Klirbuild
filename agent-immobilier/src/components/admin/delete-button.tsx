"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  endpoint,
  id,
  label,
  confirmLabel,
}: {
  endpoint: string;
  id: string;
  label: string;
  confirmLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const message =
      confirmLabel ||
      `Supprimer « ${label} » ? Cette action est définitive.`;
    if (!window.confirm(message)) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Suppression impossible.");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={onDelete}
        className="border-red-200 text-red-700 hover:border-red-400 hover:bg-red-50"
      >
        {pending ? "Suppression…" : "Supprimer"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
