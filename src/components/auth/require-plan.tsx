"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPlan, type PlanFeatureKey, planHasFeature } from "@/lib/billing/plans";
import { useSessionStore } from "@/lib/workforce/session";

export function RequirePlan({
  feature,
  children,
  title = "Fonctionnalité réservée",
}: {
  feature: PlanFeatureKey;
  children: React.ReactNode;
  title?: string;
}) {
  const planId = useSessionStore((s) => s.plan);
  const plan = getPlan(planId);

  if (planHasFeature(planId, feature)) {
    return <>{children}</>;
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Votre plan actuel <strong className="capitalize">{plan.name}</strong> ne
            inclut pas cet accès. Passez à Growth, Business ou Enterprise pour
            débloquer cette fonctionnalité.
          </p>
        </div>
        <Link href="/billing">
          <Button>
            <Sparkles className="h-4 w-4" />
            Voir les abonnements
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
