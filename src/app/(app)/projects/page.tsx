import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { projects } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader
        title="Projects"
        description="Delivery progress, members, and budgets."
        actions={
          <>
            <Link href="/tasks">
              <Button variant="outline">Tasks</Button>
            </Link>
            <Button>New project</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{project.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.clientName}
                  </p>
                </div>
                <StatusBadge status={project.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
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
                  Due {formatDate(project.dueDate)}
                </span>
                <span className="font-medium">{formatCurrency(project.budget)}</span>
              </div>
              <div className="flex -space-x-2">
                {project.members.map((m) => (
                  <div
                    key={m}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-brand-100 text-[10px] font-semibold text-brand-700"
                  >
                    {m}
                  </div>
                ))}
              </div>
              <Link href={`/projects/${project.id}`} className="block">
                <Button variant="outline" className="w-full">
                  Open board
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
