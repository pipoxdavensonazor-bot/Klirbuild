"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeDocumentTax,
  type LineItemInput,
} from "@/lib/tax/document-tax";
import type { MarketRegionId } from "@/lib/markets/regions";
import { formatCurrency } from "@/lib/utils";

export const BILLING_UNITS = [
  { value: "", label: "Unité…" },
  { value: "Sac", label: "Sac" },
  { value: "Boîtes", label: "Boîtes" },
  { value: "m²", label: "Mètre carré (m²)" },
  { value: "m", label: "Mètre linéaire (m)" },
  { value: "h", label: "Heure (h)" },
  { value: "jour", label: "Jour" },
  { value: "forfait", label: "Forfait" },
  { value: "unité", label: "Unité" },
  { value: "lot", label: "Lot" },
];

const emptyRow = (): LineItemInput => ({
  description: "",
  unit: "",
  quantity: 1,
  unitPrice: 0,
});

type Props = {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  marketRegion?: MarketRegionId;
};

export function LineItemsEditor({ items, onChange, marketRegion = "CA-QC" }: Props) {
  const breakdown = computeDocumentTax(items, marketRegion);

  function updateRow(index: number, patch: Partial<LineItemInput>) {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <div className="hidden text-xs font-medium uppercase text-muted-foreground sm:grid sm:grid-cols-12 sm:gap-2">
        <span className="sm:col-span-4">Description</span>
        <span className="sm:col-span-2">Unité</span>
        <span className="sm:col-span-2">Qté</span>
        <span className="sm:col-span-2">Prix unit.</span>
        <span className="sm:col-span-2 text-right">Total</span>
      </div>
      <div className="space-y-2">
        {items.map((row, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-12">
            <Input
              className="sm:col-span-4"
              placeholder="Description (ex. Ciment, Main-d'œuvre)"
              value={row.description}
              onChange={(e) => updateRow(index, { description: e.target.value })}
            />
            <select
              className="h-10 rounded-md border border-border bg-background px-2 text-sm sm:col-span-2"
              value={row.unit ?? ""}
              onChange={(e) => updateRow(index, { unit: e.target.value })}
            >
              {BILLING_UNITS.map((u) => (
                <option key={u.value || "empty"} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <Input
              className="sm:col-span-2"
              type="number"
              min={0}
              step="0.01"
              placeholder="Qté"
              value={row.quantity || ""}
              onChange={(e) =>
                updateRow(index, { quantity: Number(e.target.value) || 0 })
              }
            />
            <Input
              className="sm:col-span-2"
              type="number"
              min={0}
              step="0.01"
              placeholder="Prix unit."
              value={row.unitPrice || ""}
              onChange={(e) =>
                updateRow(index, { unitPrice: Number(e.target.value) || 0 })
              }
            />
            <div className="flex items-center gap-1 sm:col-span-2">
              <span className="flex-1 text-right text-sm font-medium">
                {formatCurrency(row.quantity * row.unitPrice, breakdown.currency)}
              </span>
              {items.length > 1 ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...items, emptyRow()])}
      >
        <Plus className="h-4 w-4" />
        Ajouter une ligne
      </Button>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Taxes automatiques — {breakdown.regionLabel}
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{formatCurrency(breakdown.subtotal, breakdown.currency)}</span>
          </div>
          {breakdown.taxLines.map((t) => (
            <div key={t.code} className="flex justify-between text-muted-foreground">
              <span>
                {t.name} ({(t.rate * 100).toFixed(3)}%)
              </span>
              <span>{formatCurrency(t.amount, breakdown.currency)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(breakdown.total, breakdown.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { emptyRow as emptyLineItem };
