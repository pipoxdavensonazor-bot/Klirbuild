"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type GanttTask = {
  id: string;
  title: string;
  status: string;
  startDate?: string;
  dueDate?: string;
  createdAt?: string;
};

function parseDay(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShort(date: Date) {
  return date.toLocaleDateString("fr-CA", { month: "short", day: "numeric" });
}

const statusColors: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-brand-500",
  review: "bg-amber-500",
  done: "bg-emerald-500",
};

export function ProjectGantt({
  tasks,
  projectDueDate,
}: {
  tasks: GanttTask[];
  projectDueDate?: string;
}) {
  const { rangeStart, rangeEnd, bars, weekLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ranges = tasks.map((task) => {
      const start =
        parseDay(task.startDate) ??
        parseDay(task.createdAt) ??
        addDays(parseDay(task.dueDate) ?? today, -7);
      const end = parseDay(task.dueDate) ?? addDays(start, 7);
      return { task, start, end: end < start ? addDays(start, 3) : end };
    });

    const projectEnd = parseDay(projectDueDate);
    let start = ranges.reduce(
      (min, r) => (r.start < min ? r.start : min),
      ranges[0]?.start ?? today
    );
    let end = ranges.reduce(
      (max, r) => (r.end > max ? r.end : max),
      ranges[0]?.end ?? addDays(today, 28)
    );
    if (projectEnd && projectEnd > end) end = projectEnd;
    if (end <= start) end = addDays(start, 14);

    const totalMs = end.getTime() - start.getTime();
    const bars = ranges.map(({ task, start: s, end: e }) => {
      const left = ((s.getTime() - start.getTime()) / totalMs) * 100;
      const width = Math.max(4, ((e.getTime() - s.getTime()) / totalMs) * 100);
      return { task, left, width };
    });

    const weeks = Math.max(4, Math.ceil(totalMs / (7 * 86400000)));
    const weekLabels = Array.from({ length: weeks }, (_, i) => {
      const d = addDays(start, i * 7);
      return formatShort(d);
    });

    return { rangeStart: start, rangeEnd: end, bars, weekLabels };
  }, [tasks, projectDueDate]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50/70 p-4 text-sm text-muted-foreground dark:bg-slate-900/30">
        Aucune tâche — ajoutez des tâches avec dates pour afficher le Gantt.
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Gantt</h2>
        <p className="text-xs text-muted-foreground">
          {formatShort(rangeStart)} → {formatShort(rangeEnd)}
        </p>
      </div>

      <div className="mb-2 grid text-[10px] uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: `140px repeat(${weekLabels.length}, minmax(48px, 1fr))` }}
      >
        <div>Tâche</div>
        {weekLabels.map((label) => (
          <div key={label} className="text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {bars.map(({ task, left, width }) => (
          <div
            key={task.id}
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: `140px 1fr` }}
          >
            <div className="truncate text-sm font-medium" title={task.title}>
              {task.title}
            </div>
            <div className="relative h-7 rounded-md bg-muted/60">
              <div
                className={cn(
                  "absolute top-1 h-5 rounded-md opacity-90",
                  statusColors[task.status] ?? "bg-brand-400"
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${task.startDate ?? "—"} → ${task.dueDate ?? "—"}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
