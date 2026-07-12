"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectGantt } from "@/components/projects/project-gantt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import type { Project } from "@/types";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeName?: string;
  startDate?: string;
  dueDate?: string;
  createdAt?: string;
};

const columns = ["todo", "in_progress", "review", "done"] as const;

export function ProjectDetailClient({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(apiUrl(`/api/projects/${id}`), { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Projet introuvable.");
          return;
        }
        setProject(data.project ?? null);
        setTasks(data.tasks ?? []);
      })
      .catch(() => setError("Impossible de charger le projet."));
  }, [id]);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {error}{" "}
        <Link href="/projects" className="font-medium underline">
          Retour aux projets
        </Link>
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        description={`${project.clientName} · Gantt & Kanban`}
        actions={<StatusBadge status={project.status} />}
      />

      <ProjectGantt tasks={tasks} projectDueDate={project.dueDate} />

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((status) => (
          <Card key={status} className="min-w-[240px] flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm capitalize">
                {status.replaceAll("_", " ")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks
                .filter((t) => t.status === status)
                .map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StatusBadge status={task.priority} />
                      <span className="text-xs text-muted-foreground">
                        {task.assigneeName ?? "—"}
                      </span>
                    </div>
                  </div>
                ))}
              {tasks.filter((t) => t.status === status).length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune tâche</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
