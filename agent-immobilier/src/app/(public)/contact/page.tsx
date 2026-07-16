import { prisma } from "@/lib/prisma";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const profile = await prisma.profile.findFirst();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Contact</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        Parlons de votre projet
      </h1>
      <div className="mt-8 space-y-3 text-slate-600">
        <p>
          Téléphone :{" "}
          <a className="text-[#0F172A] hover:underline" href={`tel:${profile?.phone}`}>
            {profile?.phone ?? "(514) 574-8712"}
          </a>
        </p>
        <p>
          Courriel :{" "}
          <a
            className="text-[#0F172A] hover:underline"
            href={`mailto:${profile?.email ?? "bienaimeleonne_@hotmail.com"}`}
          >
            {profile?.email ?? "bienaimeleonne_@hotmail.com"}
          </a>
        </p>
        <p>
          {profile?.address}
          <br />
          {profile?.city}
        </p>
      </div>
    </div>
  );
}
