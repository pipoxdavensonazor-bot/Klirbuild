import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { projects, tasks } from "@/lib/mock-data";

const columns = ["todo", "in_progress", "review", "done"] as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  const projectTasks = tasks.filter((t) => t.projectId === id);

  return (
    <div>
      <PageHeader
        title={project.name}
        description={`${project.clientName} · Kanban + milestones placeholder`}
        actions={<StatusBadge status={project.status} />}
      />

      <div className="mb-4 rounded-xl border border-dashed border-border bg-slate-50/70 p-4 text-sm text-muted-foreground dark:bg-slate-900/30">
        Gantt chart placeholder — timeline visualization can plug in here without changing board data.
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((status) => (
          <Card key={status} className="min-w-[240px] flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm capitalize">
                {status.replaceAll("_", " ")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectTasks
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
                        {task.assignee}
                      </span>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
