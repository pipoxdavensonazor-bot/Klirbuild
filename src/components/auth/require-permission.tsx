"use client";

import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { canApp, type AppPermission } from "@/lib/workforce/types";
import { useSessionStore } from "@/lib/workforce/session";

export function RequirePermission({
  permission,
  children,
  fallback,
}: {
  permission: AppPermission | AppPermission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const role = useSessionStore((s) => s.role);
  const list = Array.isArray(permission) ? permission : [permission];
  const ok = list.some((p) => canApp(role, p));

  if (!ok) {
    return (
      fallback ?? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
            <div>
              <p className="font-semibold">Accès restreint</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Votre rôle ({role.replaceAll("_", " ")}) n&apos;a pas la permission
                requise pour cette section.
              </p>
            </div>
          </CardContent>
        </Card>
      )
    );
  }

  return <>{children}</>;
}
