import { prisma } from "@/lib/prisma";
import { SiteImage } from "@/components/ui/site-image";
import { RichHtml } from "@/components/ui/rich-html";
import { resolvePublicPhotoUrl, PORTRAIT_CAREER } from "@/lib/photos";

export const metadata = {
  title: "À propos",
  description:
    "Parcours, mission et expertise de Léonne Bien-Aimé, courtière immobilière — PROPRIO DIRECT.",
};

function hasText(html: string) {
  return html.replace(/<[^>]+>/g, "").trim().length > 0;
}

export default async function AboutPage() {
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <p>Profil à configurer. Lancez le seed de la base de données.</p>
      </div>
    );
  }

  const photo = resolvePublicPhotoUrl(profile.photoUrl, PORTRAIT_CAREER);

  return (
    <div>
      <section className="bg-[#0F172A] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">À propos</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
            {profile.name}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">{profile.title}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:gap-8 sm:px-6 lg:grid-cols-5 lg:gap-10 lg:px-8">
        <div className="lg:col-span-2">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#0B1220]">
            <SiteImage
              src={photo}
              alt={`${profile.name} — 20 ans de carrière`}
              fill
              className="object-cover object-[center_12%]"
              sizes="40vw"
              priority
            />
          </div>
        </div>
        <div className="space-y-8 lg:col-span-3">
          <RichHtml
            html={profile.bio}
            className="text-lg text-slate-600 [&_a]:text-[#C9A227] [&_p]:mb-3"
          />
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
              Mon histoire
            </h2>
            <RichHtml
              html={profile.story}
              className="mt-2 text-slate-600 [&_a]:text-[#C9A227] [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
            />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
              Mission
            </h2>
            <RichHtml
              html={profile.mission}
              className="mt-2 text-slate-600 [&_a]:text-[#C9A227] [&_p]:mb-2"
            />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
              Expérience
            </h2>
            <RichHtml
              html={profile.experience}
              className="mt-2 text-slate-600 [&_a]:text-[#C9A227] [&_li]:ml-5 [&_p]:mb-2 [&_ul]:list-disc"
            />
          </div>
          {hasText(profile.degrees) ? (
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
                Formation
              </h2>
              <RichHtml
                html={profile.degrees}
                className="mt-2 text-slate-600 [&_a]:text-[#C9A227] [&_li]:ml-5 [&_p]:mb-2 [&_ul]:list-disc"
              />
            </div>
          ) : null}
          {hasText(profile.certifications) ? (
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
                Certifications
              </h2>
              <RichHtml
                html={profile.certifications}
                className="mt-2 text-slate-600 [&_a]:text-[#C9A227] [&_li]:ml-5 [&_p]:mb-2 [&_ul]:list-disc"
              />
            </div>
          ) : null}
          {hasText(profile.awards) ? (
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
                Reconnaissances
              </h2>
              <RichHtml
                html={profile.awards}
                className="mt-2 text-slate-600 [&_a]:text-[#C9A227] [&_li]:ml-5 [&_p]:mb-2 [&_ul]:list-disc"
              />
            </div>
          ) : null}
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
              Valeurs
            </h2>
            <RichHtml
              html={profile.values}
              className="mt-2 text-slate-600 [&_a]:text-[#C9A227] [&_li]:ml-5 [&_p]:mb-2 [&_ul]:list-disc"
            />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
              Langues
            </h2>
            <RichHtml
              html={profile.languages}
              className="mt-2 text-slate-600 [&_p]:mb-2"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
