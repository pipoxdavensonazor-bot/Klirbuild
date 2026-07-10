import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    won: "bg-emerald-50 text-emerald-700 border-emerald-200",
    done: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    invoiced: "bg-emerald-50 text-emerald-700 border-emerald-200",
    clocked_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
    on_site: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    pending_review: "bg-amber-50 text-amber-700 border-amber-200",
    submitted: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    paused: "bg-amber-50 text-amber-700 border-amber-200",
    review: "bg-amber-50 text-amber-700 border-amber-200",
    on_hold: "bg-amber-50 text-amber-700 border-amber-200",
    negotiation: "bg-amber-50 text-amber-700 border-amber-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    sent: "bg-sky-50 text-sky-700 border-sky-200",
    in_progress: "bg-sky-50 text-sky-700 border-sky-200",
    sold: "bg-sky-50 text-sky-700 border-sky-200",
    ready: "bg-sky-50 text-sky-700 border-sky-200",
    traveling: "bg-sky-50 text-sky-700 border-sky-200",
    qualified: "bg-sky-50 text-sky-700 border-sky-200",
    MANAGER: "bg-sky-50 text-sky-700 border-sky-200",
    google_ads: "bg-sky-50 text-sky-700 border-sky-200",
    draft: "bg-slate-50 text-slate-600 border-slate-200",
    inactive: "bg-slate-50 text-slate-600 border-slate-200",
    canceled: "bg-slate-50 text-slate-600 border-slate-200",
    cancelled: "bg-slate-50 text-slate-600 border-slate-200",
    todo: "bg-slate-50 text-slate-600 border-slate-200",
    planned: "bg-slate-50 text-slate-600 border-slate-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
    clocked_out: "bg-slate-50 text-slate-600 border-slate-200",
    warranty: "bg-slate-50 text-slate-600 border-slate-200",
    ended: "bg-slate-50 text-slate-600 border-slate-200",
    EMPLOYEE: "bg-slate-50 text-slate-600 border-slate-200",
    lead: "bg-violet-50 text-violet-700 border-violet-200",
    estimating: "bg-violet-50 text-violet-700 border-violet-200",
    estimate: "bg-violet-50 text-violet-700 border-violet-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    off_site: "bg-red-50 text-red-700 border-red-200",
    high: "bg-red-50 text-red-700 border-red-200",
    trialing: "bg-accent-50 text-accent-600 border-accent-100",
    SUPER_ADMIN: "bg-accent-50 text-accent-600 border-accent-100",
    COMPANY_ADMIN: "bg-brand-50 text-brand-700 border-brand-200",
    connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
    needs_reauth: "bg-amber-50 text-amber-700 border-amber-200",
    disconnected: "bg-slate-50 text-slate-600 border-slate-200",
    generated: "bg-sky-50 text-sky-700 border-sky-200",
    filed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <Badge className={cn("capitalize", map[status] ?? "bg-slate-50 text-slate-600")}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
