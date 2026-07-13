import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoEmbed } from "@/components/help/video-embed";
import { getTutorial, tutorials } from "@/lib/help/tutorials";

export function generateStaticParams() {
  return tutorials.map((t) => ({ slug: t.slug }));
}

export default async function HelpTutorialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tutorial = getTutorial(slug);
  if (!tutorial) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href="/help">
          <Button variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            Retour au centre d&apos;aide
          </Button>
        </Link>
      </div>

      <PageHeader
        title={tutorial.title}
        description={tutorial.description}
        actions={
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {tutorial.duration}
          </span>
        }
      />

      <div className="mb-8">
        <VideoEmbed url={tutorial.videoUrl} title={tutorial.title} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Étapes du tutoriel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tutorial.steps.map((step, i) => (
              <div
                key={`${step.title}-${i}`}
                className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{step.title}</p>
                    {step.time ? (
                      <span className="text-xs text-muted-foreground">{step.time}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
                    >
                      Ouvrir dans l&apos;app
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pages liées</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {tutorial.relatedHrefs.map((href) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/30"
              >
                {href}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
