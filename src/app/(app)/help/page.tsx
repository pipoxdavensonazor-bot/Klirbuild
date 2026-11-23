import Link from "next/link";
import { Clock, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GettingStartedChecklist } from "@/components/help/getting-started-checklist";
import {
  tutorialCategories,
  tutorials,
  tutorialVideoUrl,
  type Tutorial,
} from "@/lib/help/tutorials";

function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const hasVideo = Boolean(tutorialVideoUrl(tutorial));

  return (
    <Link href={`/help/${tutorial.slug}`}>
      <Card className="h-full transition hover:border-brand-300 hover:shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{tutorial.title}</CardTitle>
            {hasVideo ? (
              <Badge className="shrink-0 gap-1 bg-brand-50 text-brand-700">
                <PlayCircle className="h-3 w-3" />
                Vidéo
              </Badge>
            ) : (
              <Badge className="shrink-0 text-muted-foreground">Guide</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{tutorial.description}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {tutorial.duration}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HelpPage() {
  const categories = Object.keys(tutorialCategories) as Tutorial["category"][];

  return (
    <div>
      <PageHeader
        title="Centre d'aide"
        description="Tutoriels vidéo et guides pas à pas pour maîtriser KlirBuild."
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Tutoriels vidéo</p>
              <p className="mt-2">
                Chaque guide comprend une courte vidéo commentée en français, avec sous-titres,
                tournée sur une entreprise de démonstration, ainsi que les étapes détaillées pour
                refaire chaque action dans votre compte.
              </p>
            </CardContent>
          </Card>
        </div>
        <GettingStartedChecklist />
      </div>

      {categories.map((category) => {
        const meta = tutorialCategories[category];
        const list = tutorials
          .filter((t) => t.category === category)
          .sort((a, b) => a.order - b.order);

        return (
          <section key={category} className="mb-10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{meta.label}</h2>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((tutorial) => (
                <TutorialCard key={tutorial.slug} tutorial={tutorial} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
