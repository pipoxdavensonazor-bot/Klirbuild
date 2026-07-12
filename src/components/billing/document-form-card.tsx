"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import type { LineItemInput } from "@/lib/tax/document-tax";
import type { MarketRegionId } from "@/lib/markets/regions";
import type { Client } from "@/types";
import {
  LineItemsEditor,
  emptyLineItem,
} from "@/components/billing/line-items-editor";

type Props = {
  type: "quote" | "invoice";
  clients: Client[];
  marketRegion: MarketRegionId;
  editingId?: string | null;
  initialClientId?: string;
  initialItems?: LineItemInput[];
  onSaved: () => void;
  onCancel: () => void;
};

export function DocumentFormCard({
  type,
  clients,
  marketRegion,
  editingId,
  initialClientId = "",
  initialItems,
  onSaved,
  onCancel,
}: Props) {
  const [clientId, setClientId] = useState(initialClientId);
  const [items, setItems] = useState<LineItemInput[]>(
    initialItems?.length ? initialItems : [emptyLineItem()]
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const label = type === "quote" ? "soumission" : "facture";
  const apiBase = type === "quote" ? "quotes" : "invoices";

  async function save() {
    setError("");
    setLoading(true);
    try {
      const url = editingId
        ? apiUrl(`/api/${apiBase}/${editingId}`)
        : apiUrl(`/api/${apiBase}`);
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId, items, marketRegion }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Enregistrement échoué");
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          {editingId ? `Modifier la ${label}` : `Nouvelle ${label}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Client</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Choisir un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <LineItemsEditor items={items} onChange={setItems} marketRegion={marketRegion} />
        <div className="flex gap-2">
          <Button disabled={!clientId || loading} onClick={() => void save()}>
            {loading ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
