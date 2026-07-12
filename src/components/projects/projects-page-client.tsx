"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { clients as mockClients } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Project, ProjectStatus } from "@/types";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planifié" },
  { value: "active", label: "Actif" },
  { value: "on_hold", label: "En pause" },
  { value: "completed", label: "Terminé" },
];

const emptyForm = () => ({
  name: "",
  clientId: "",
  budget: "",
  status: "planned" as ProjectStatus,
});

export function ProjectsPageClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/projects"), { credentials: "include" });
    const data = await res.json();
    setProjects(data.projects ?? []);
  }, []);

  useEffect(() => {
    load();
    fetch(apiUrl("/api/clients"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(d.clients?.length ? d.clients : mockClients))
      .catch(() => setClients(mockClients));
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
    setError("");
  }

  function openEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      clientId: project.clientId ?? "",
      budget: String(project.budget),
      status: project.status,
    });
    setFormOpen(true);
    setError("");
  }

  async function saveProject() {
    if (!form.name.trim()) {
      setError("Nom du projet requis.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        clientId: form.clientId || undefined,
        budget: Number(form.budget) || 0,
        status: form.status,
      };
      const url = editingId
        ? apiUrl(`/api/projects/${editingId}`)
        : apiUrl("/api/projects");
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Enregistrement échoué");
        return;
      }
      setFormOpen(false);
      setMessage(editingId ? "Projet mis à jour." : "Projet créé.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Projets"
        description="Créez et gérez vos chantiers et livraisons."
        actions={
          <div className="flex gap-2">
            <Link href="/tasks">
              <Button variant="outline">Tâches</Button>
            </Link>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau projet
            </Button>
          </div>
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {formOpen ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Modifier le projet" : "Nouveau projet"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
            <Input
              placeholder="Nom du projet"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            >
              <option value="">Client (optionnel)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              placeholder="Budget"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            />
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button disabled={loading} onClick={() => void saveProject()}>
                {loading ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer"}
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            Aucun projet. Cliquez sur « Nouveau projet » pour commencer.
          </p>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{project.clientName}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Progression</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {project.dueDate ? `Échéance ${formatDate(project.dueDate)}` : "—"}
                  </span>
                  <span className="font-medium">{formatCurrency(project.budget)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEdit(project)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Link href={`/projects/${project.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      Ouvrir
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
