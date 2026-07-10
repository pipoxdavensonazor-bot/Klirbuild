import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getModule } from "@/modules/registry";

export default async function ModuleStubPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const mod = getModule(moduleId);
  if (!mod) notFound();

  return (
    <div>
      <PageHeader
        title={mod.name}
        description="Business OS module stub — ready for vertical features."
        actions={
          <Link href="/settings">
            <Button variant="outline">Manage modules</Button>
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Extension point</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{mod.description}</p>
          <p>
            Implement routes, permissions, and dashboard widgets under{" "}
            <code>src/modules/{mod.id}</code> and register them in{" "}
            <code>src/modules/registry.ts</code>.
          </p>
          <p>Core stays stable — verticals plug in without rewriting the kernel.</p>
        </CardContent>
      </Card>
    </div>
  );
}
