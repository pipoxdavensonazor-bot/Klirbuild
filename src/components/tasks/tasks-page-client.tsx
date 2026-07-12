"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import type { TaskDto } from "@/lib/tasks/task-service";
import { formatDate } from "@/lib/utils";

const empty = (): Partial<TaskDto> => ({
  title: "",
  projectName: "",
  status: "todo",
  priority: "medium",
  assigneeName: "",
  dueDate: "",
});

export function TasksPageClient() {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/tasks"), { credentials: "include" });
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!form.title?.trim()) {
      setError("Titre requis.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/tasks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, id: editingId ?? undefined }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Enregistrement échoué");
        return;
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette tâche ?")) return;
    await fetch(apiUrl("/api/tasks"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "delete", id }),
    });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Tâches"
        description="Créez et modifiez les tâches de vos chantiers."
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              setForm(empty());
              setFormOpen(true);
              setError("");
            }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {formOpen ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Modifier la tâche" : "Nouvelle tâche"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">Titre *</span>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Projet / chantier</span>
              <Input
                value={form.projectName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Assigné à</span>
              <Input
                value={form.assigneeName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, assigneeName: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Statut</span>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={form.status ?? "todo"}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="done">Terminé</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Priorité</span>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={form.priority ?? "medium"}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Échéance</span>
              <Input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button disabled={busy} onClick={() => void save()}>
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Tâche</th>
              <th className="px-4 py-3">Projet</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Priorité</th>
              <th className="px-4 py-3">Assigné</th>
              <th className="px-4 py-3">Échéance</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{task.title}</td>
                <td className="px-4 py-3">{task.projectName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={task.priority} />
                </td>
                <td className="px-4 py-3">{task.assigneeName ?? "—"}</td>
                <td className="px-4 py-3">
                  {task.dueDate ? formatDate(task.dueDate) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(task.id);
                        setForm(task);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => void remove(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
