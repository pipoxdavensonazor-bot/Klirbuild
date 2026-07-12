import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { getModule } from "@/modules/registry";
import { getModulePageContent } from "@/modules/module-pages";

export default async function ModuleStubPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const mod = getModule(moduleId);
  if (!mod) notFound();

  if (moduleId === "construction-os") {
    return (
      <div>
        <PageHeader
          title={mod.name}
          description="ERP construction complet — déjà disponible."
          actions={
            <Link href="/construction">
              <Button>Ouvrir Construction OS</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const content = getModulePageContent(mod);

  return (
    <div>
      <PageHeader
        title={mod.name}
        description={content.tagline}
        actions={
          <>
            <StatusBadge status={content.status === "available" ? "active" : "pending"} />
            <Link href="/settings">
              <Button variant="outline">Gérer les modules</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fonctionnalités prévues</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              {content.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feuille de route</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              {content.roadmap.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Le noyau Klirline (clients, factures, paie, documents) reste partagé — chaque
              vertical ajoute routes et widgets sous <code>src/modules/{mod.id}</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
