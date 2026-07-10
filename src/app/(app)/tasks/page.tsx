import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { tasks } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function TasksPage() {
  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Global task inbox across projects."
        actions={
          <>
            <Button variant="outline">Calendar view</Button>
            <Button>New task</Button>
          </>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Due</th>
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
                <td className="px-4 py-3">{task.assignee}</td>
                <td className="px-4 py-3">{formatDate(task.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
