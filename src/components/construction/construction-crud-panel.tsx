"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ConstructionEntityKey } from "@/lib/construction/workspace-types";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "checkbox";
  options?: { value: string; label: string }[];
  required?: boolean;
  col?: "full" | "half";
};

type ConstructionCrudPanelProps<T extends Record<string, unknown>> = {
  entity: ConstructionEntityKey;
  title: string;
  items: T[];
  fields: FieldDef[];
  columns: { key: string; label: string; format?: (row: T) => string }[];
  emptyItem: () => T;
  addLabel?: string;
  onSave: (
    entity: ConstructionEntityKey,
    payload: { id?: string; data: Record<string, unknown> }
  ) => Promise<void>;
  onRemove: (entity: ConstructionEntityKey, id: string) => Promise<void>;
};

export function ConstructionCrudPanel<T extends Record<string, unknown>>({
  entity,
  title,
  items,
  fields,
  columns,
  emptyItem,
  addLabel = "Ajouter",
  onSave,
  onRemove,
}: ConstructionCrudPanelProps<T>) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<T>(emptyItem());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function openCreate() {
    setEditingId(null);
    setForm(emptyItem());
    setOpen(true);
    setError("");
  }

  function openEdit(row: T) {
    setEditingId(String(row.id));
    setForm({ ...row });
    setOpen(true);
    setError("");
  }

  async function save() {
    for (const f of fields) {
      if (!f.required) continue;
      const val = form[f.key as keyof T];
      if (val === "" || val === undefined || val === null) {
        setError(`${f.label} requis.`);
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const data: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = form[f.key as keyof T];
        if (f.type === "number") data[f.key] = Number(raw) || 0;
        else if (f.type === "checkbox") data[f.key] = Boolean(raw);
        else data[f.key] = raw;
      }
      await onSave(entity, { id: editingId ?? undefined, data });
      setOpen(false);
      setMessage(editingId ? "Mis à jour." : "Ajouté.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet élément ?")) return;
    setBusy(true);
    try {
      await onRemove(entity, id);
      setMessage("Supprimé.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {message ? (
        <p className="mb-3 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error && !open ? (
        <p className="mb-3 text-sm text-red-700">{error}</p>
      ) : null}

      {open ? (
        <Card className="mb-4 border-brand-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {editingId ? "Modifier" : "Nouveau"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <label
                  key={f.key}
                  className={`block text-sm ${f.col === "full" ? "sm:col-span-2" : ""}`}
                >
                  <span className="mb-1 block text-muted-foreground">{f.label}</span>
                  {f.type === "select" ? (
                    <select
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      value={String(form[f.key as keyof T] ?? "")}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                    >
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={String(form[f.key as keyof T] ?? "")}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                    />
                  ) : f.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(form[f.key as keyof T])}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [f.key]: e.target.checked }))
                      }
                    />
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={String(form[f.key as keyof T] ?? "")}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [f.key]:
                            f.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <Button disabled={busy} onClick={() => void save()}>
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={String(row.id)} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    {c.format
                      ? c.format(row)
                      : String(row[c.key as keyof T] ?? "—")}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(row)}
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => void remove(String(row.id))}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Aucun élément — cliquez sur {addLabel}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
