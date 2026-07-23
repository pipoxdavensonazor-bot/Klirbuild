import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Télécharger KlirBuild — Windows & Android",
  description:
    "Installer KlirBuild sur Windows (.exe) ou Android (APK / Play Store AAB).",
};

const files = [
  {
    title: "Windows — installateur",
    file: "KlirBuild-setup.exe",
    hint: "Double-cliquez pour installer sur votre PC (Windows 10/11).",
    badge: "EXE",
  },
  {
    title: "Windows — portable",
    file: "KlirBuild.exe",
    hint: "Sans installation — lancez directement le fichier.",
    badge: "EXE",
  },
  {
    title: "Android — APK",
    file: "KlirBuild-release.apk",
    hint: "Installez sur votre téléphone (autorisez « sources inconnues » si demandé).",
    badge: "APK",
  },
  {
    title: "Android — Play Store (AAB)",
    file: "KlirBuild-release.aab",
    hint: "Bundle pour publication Google Play Console.",
    badge: "AAB",
  },
] as const;

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold tracking-wide text-[#004F6E]">
          KlirBuild
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Installer l’application
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Téléchargez KlirBuild pour votre ordinateur Windows ou votre téléphone
          Android. L’app ouvre votre espace{" "}
          <a className="underline" href="https://klirline.app">
            klirline.app
          </a>
          .
        </p>

        <div className="mt-8 space-y-3">
          {files.map((item) => (
            <a
              key={item.file}
              href={`/downloads/${item.file}`}
              className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-[#004F6E]/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              download={item.file}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#004F6E] px-2 py-0.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                  <p className="font-semibold">{item.title}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.hint}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  {item.file}
                </p>
              </div>
              <span className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-[#004F6E] px-4 text-sm font-medium text-white sm:mt-0">
                Télécharger
              </span>
            </a>
          ))}
        </div>

        <section className="mt-10 space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Android — Play Store</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Ouvrez{" "}
              <a
                className="underline"
                href="https://play.google.com/console"
                target="_blank"
                rel="noreferrer"
              >
                Google Play Console
              </a>{" "}
              (compte déjà connecté)
            </li>
            <li>App « KlirBuild » — package <code>app.klirline.klirbuild</code></li>
            <li>
              Uploadez{" "}
              <a className="underline" href="/downloads/KlirBuild-release.aab">
                KlirBuild-release.aab
              </a>
            </li>
            <li>
              Icône 512 :{" "}
              <a className="underline" href="/downloads/play/icon-512.png">
                icon-512.png
              </a>
              {" · "}
              Bannière :{" "}
              <a className="underline" href="/downloads/play/feature-graphic.png">
                feature-graphic.png
              </a>
            </li>
            <li>Publiez en test interne, puis production</li>
          </ol>
          <p className="text-xs text-slate-500">
            En attendant la validation Play, installez l’APK directement.
          </p>
        </section>

        <section className="mt-10 space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Documentation projet</h2>
          <p>
            Inventaire complet des applications, services et outils utilisés
            dans KlirBuild (PDF) :
          </p>
          <a
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#004F6E] px-4 text-sm font-medium text-white"
            href="/docs/KlirBuild-inventaire-applications.pdf"
            download="KlirBuild-inventaire-applications.pdf"
          >
            Télécharger l’inventaire PDF
          </a>
        </section>

        <p className="mt-8 text-sm">
          <Link href="/login" className="text-[#004F6E] underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
