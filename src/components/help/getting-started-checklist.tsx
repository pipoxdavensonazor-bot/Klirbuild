"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "klirbuild-getting-started-v1";

const items = [
  {
    id: "account",
    label: "Créer ou configurer mon entreprise",
    href: "/help/creer-entreprise",
  },
  {
    id: "team",
    label: "Inviter mon équipe",
    href: "/help/inviter-equipe-roles",
  },
  {
    id: "market",
    label: "Choisir mon marché (QC / US / CB)",
    href: "/markets",
  },
  {
    id: "quote",
    label: "Créer mon premier devis",
    href: "/quotes",
  },
  {
    id: "project",
    label: "Ouvrir un chantier ou projet",
    href: "/projects",
  },
  {
    id: "chat",
    label: "Tester le chat d'équipe",
    href: "/team-chat",
  },
];

export function GettingStartedChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const completed = items.filter((i) => done[i.id]).length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <Card className="border-brand-200/60 bg-gradient-to-br from-brand-50/50 to-white dark:from-brand-950/30 dark:to-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-brand-600" />
          Premiers pas
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {completed}/{items.length} · {progress}%
          </span>
        </CardTitle>
        <div className="h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => {
          const checked = !!done[item.id];
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-white/60 dark:hover:bg-white/5"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="shrink-0 text-brand-600"
                aria-label={checked ? "Marquer non fait" : "Marquer fait"}
              >
                {checked ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <Link
                href={item.href}
                className={cn(
                  "flex-1 transition",
                  checked && "text-muted-foreground line-through"
                )}
              >
                {item.label}
              </Link>
            </div>
          );
        })}
        <Link href="/help" className="mt-3 block">
          <Button variant="outline" size="sm" className="w-full">
            Ouvrir le centre d&apos;aide
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
