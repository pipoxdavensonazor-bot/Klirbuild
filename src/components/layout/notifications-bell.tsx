"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-client";
import { cn, formatDate } from "@/lib/utils";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/notifications"), { credentials: "include" });
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(Number(data.unread ?? 0));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markAllRead() {
    await fetch(apiUrl("/api/notifications"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    setUnread(0);
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs text-brand-700 hover:underline"
                onClick={() => void markAllRead()}
              >
                Tout marquer lu
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aucune notification
              </p>
            ) : (
              items.map((n) => {
                const row = (
                  <div
                    className={cn(
                      "border-b border-border px-3 py-2.5 text-sm last:border-0",
                      !n.readAt && "bg-brand-50/50 dark:bg-brand-950/20"
                    )}
                  >
                    <p className="font-medium leading-snug">{n.title}</p>
                    {n.body ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                );
                return n.href ? (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block hover:bg-muted/40"
                  >
                    {row}
                  </Link>
                ) : (
                  <div key={n.id}>{row}</div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
