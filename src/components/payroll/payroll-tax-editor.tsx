"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_QC_TAX_CONFIG,
  taxConfigFields,
  type PayrollTaxConfig,
  type PayrollTaxLine,
} from "@/lib/payroll/tax-config";

type Props = {
  value: PayrollTaxConfig;
  onChange: (next: PayrollTaxConfig) => void;
  onSave?: () => void | Promise<void>;
  saving?: boolean;
  title?: string;
  description?: string;
  readOnly?: boolean;
};

function pct(rate: number) {
  return `${(rate * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function PayrollTaxEditor({
  value,
  onChange,
  onSave,
  saving,
  title = "Taxes et charges employeur",
  description = "Taux par défaut appliqués aux bulletins (modifiable par ouvrier).",
  readOnly = false,
}: Props) {
  const [extraCode, setExtraCode] = useState("");
  const [extraLabel, setExtraLabel] = useState("");
  const [extraRate, setExtraRate] = useState("0.01");
  const [extraKind, setExtraKind] = useState<"deduction" | "employer">("employer");

  function setField(key: keyof PayrollTaxConfig, raw: string) {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    onChange({ ...value, [key]: n });
  }

  function addExtraLine() {
    if (!extraCode.trim() || !extraLabel.trim()) return;
    const line: PayrollTaxLine = {
      code: extraCode.trim().toUpperCase(),
      label: extraLabel.trim(),
      rate: Number(extraRate) || 0,
      type: extraKind,
    };
    if (extraKind === "deduction") {
      onChange({
        ...value,
        extraDeductions: [...value.extraDeductions, line],
      });
    } else {
      onChange({
        ...value,
        extraEmployerCharges: [...value.extraEmployerCharges, line],
      });
    }
    setExtraCode("");
    setExtraLabel("");
    setExtraRate("0.01");
  }

  function removeExtra(code: string, kind: "deduction" | "employer") {
    if (kind === "deduction") {
      onChange({
        ...value,
        extraDeductions: value.extraDeductions.filter((l) => l.code !== code),
      });
    } else {
      onChange({
        ...value,
        extraEmployerCharges: value.extraEmployerCharges.filter((l) => l.code !== code),
      });
    }
  }

  function resetDefaults() {
    onChange({ ...DEFAULT_QC_TAX_CONFIG });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {!readOnly ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetDefaults}>
              Réinitialiser QC
            </Button>
            {onSave ? (
              <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {taxConfigFields().map((f) => {
            const v = value[f.key];
            const num = typeof v === "number" ? v : 0;
            return (
              <label key={f.key} className="block text-sm">
                <span className="mb-1 block font-medium">{f.label}</span>
                <span className="mb-1 block text-xs text-muted-foreground">{f.hint}</span>
                <Input
                  type="number"
                  step={f.step}
                  value={num}
                  disabled={readOnly}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  ≈ {f.key.includes("Multiplier") ? `×${num}` : pct(num)}
                </span>
              </label>
            );
          })}
        </div>

        {!readOnly ? (
          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="mb-3 text-sm font-medium">Ajouter une taxe ou charge personnalisée</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                placeholder="Code (ex: RRQ-SUP)"
                value={extraCode}
                onChange={(e) => setExtraCode(e.target.value)}
              />
              <Input
                placeholder="Libellé"
                value={extraLabel}
                onChange={(e) => setExtraLabel(e.target.value)}
              />
              <Input
                type="number"
                step="0.0001"
                placeholder="Taux"
                value={extraRate}
                onChange={(e) => setExtraRate(e.target.value)}
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={extraKind}
                onChange={(e) => setExtraKind(e.target.value as "deduction" | "employer")}
              >
                <option value="employer">Charge employeur</option>
                <option value="deduction">Retenue employé</option>
              </select>
              <Button type="button" variant="outline" onClick={addExtraLine}>
                Ajouter
              </Button>
            </div>
          </div>
        ) : null}

        {(value.extraDeductions.length > 0 || value.extraEmployerCharges.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Lignes personnalisées</p>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Code</th>
                  <th className="py-2">Libellé</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Taux</th>
                  {!readOnly ? <th className="py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {[...value.extraDeductions, ...value.extraEmployerCharges].map((line) => (
                  <tr key={`${line.type}-${line.code}`} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{line.code}</td>
                    <td className="py-2">{line.label}</td>
                    <td className="py-2 capitalize">
                      {line.type === "employer" ? "Employeur" : "Retenue"}
                    </td>
                    <td className="py-2 text-right">
                      {line.fixed != null ? `$${line.fixed}` : pct(line.rate ?? 0)}
                    </td>
                    {!readOnly ? (
                      <td className="py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExtra(line.code, line.type)}
                        >
                          Retirer
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
