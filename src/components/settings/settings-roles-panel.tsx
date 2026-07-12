"use client";

import { useState } from "react";
import {
  ALL_ROLES,
  ROLE_DEFINITIONS,
  permissionsForRoleDisplay,
  roleDescriptionFr,
  roleLabelFr,
} from "@/lib/workforce/roles";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "direction", label: "Direction" },
  { id: "chantier", label: "Chantier" },
  { id: "bureau", label: "Bureau" },
  { id: "support", label: "Support" },
] as const;

export function SettingsRolesPanel() {
  const [expanded, setExpanded] = useState<Role | null>("FIELD_WORKER");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rôles construction avec accès chronomètre et chat sécurisé pour{" "}
        <strong>tous les employés</strong>. Les permissions sont appliquées au menu,
        aux tableaux de bord et aux API.
      </p>
      {CATEGORIES.map((cat) => {
        const roles = ALL_ROLES.filter((r) => ROLE_DEFINITIONS[r].category === cat.id);
        if (roles.length === 0) return null;
        return (
          <div key={cat.id}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cat.label}
            </h3>
            <div className="space-y-2">
              {roles.map((role) => {
                const open = expanded === role;
                const perms = permissionsForRoleDisplay(role);
                return (
                  <div key={role} className="rounded-lg border border-border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 p-3 text-left"
                      onClick={() => setExpanded(open ? null : role)}
                    >
                      <div>
                        <p className="font-medium">{roleLabelFr(role)}</p>
                        <p className="text-xs text-muted-foreground">{role}</p>
                      </div>
                      <span className="text-xs text-brand-600">{open ? "−" : "+"}</span>
                    </button>
                    {open ? (
                      <div className="border-t border-border px-3 pb-3 pt-2 text-sm">
                        <p className="text-muted-foreground">{roleDescriptionFr(role)}</p>
                        <p className="mt-2 text-xs font-medium text-foreground">Accès :</p>
                        <ul className="mt-1 flex flex-wrap gap-1">
                          {perms.map((p) => (
                            <li
                              key={p}
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[10px]",
                                p.includes("timeclock") || p.includes("chat")
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
