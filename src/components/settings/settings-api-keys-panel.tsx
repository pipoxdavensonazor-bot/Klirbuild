"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export function SettingsApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/api-keys"), { credentials: "include" });
    const data = await res.json();
    if (res.ok && Array.isArray(data.keys)) {
      setKeys(data.keys);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    setLoading(true);
    setMessage("");
    setPlainKey(null);
    try {
      const res = await fetch(apiUrl("/api/api-keys"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: name || "API key" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Création échouée.");
        return;
      }
      setPlainKey(data.plain as string);
      setName("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(apiUrl("/api/api-keys"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Révocation échouée.");
        return;
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Générez des clés pour l&apos;API publique Klirline (hashées en base — affichées une seule
        fois à la création).
      </p>

      {plainKey ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            Copiez cette clé maintenant — elle ne sera plus affichée.
          </p>
          <code className="mt-2 block break-all rounded bg-muted px-2 py-1 text-xs">{plainKey}</code>
          <Button className="mt-2" variant="outline" size="sm" onClick={() => setPlainKey(null)}>
            J&apos;ai copié la clé
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Nom (ex. Intégration ERP)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <Button disabled={loading} onClick={() => void createKey()}>
          Créer une clé API
        </Button>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      <div className="space-y-2">
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune clé API.</p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
            >
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground">
                  Préfixe {key.prefix}… · créée{" "}
                  {new Date(key.createdAt).toLocaleDateString("fr-CA")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={key.revokedAt ? "inactive" : "active"} />
                {!key.revokedAt ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => void revoke(key.id)}
                  >
                    Révoquer
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
