#!/usr/bin/env python3
"""Génère le PDF inventaire des applications / services KlirBuild."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT_PDF = ROOT / "public" / "docs" / "KlirBuild-inventaire-applications.pdf"
OUT_PDF_DL = ROOT / "public" / "downloads" / "KlirBuild-inventaire-applications.pdf"
OUT_MD = ROOT / "docs" / "INVENTAIRE-APPLICATIONS.md"

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

BRAND = (0, 79, 110)  # #004F6E
ACCENT = (212, 175, 55)  # #D4AF37
MUTED = (90, 100, 110)
LINE = (220, 226, 232)


class InventoryPDF(FPDF):
    def __init__(self) -> None:
        super().__init__(format="A4", unit="mm")
        self.set_auto_page_break(auto=True, margin=18)
        self.add_font("Body", "", FONT)
        self.add_font("Body", "B", FONT_BOLD)
        self.add_font("Mono", "", FONT_MONO)

    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Body", "B", 9)
        self.set_text_color(*BRAND)
        self.cell(0, 6, "KlirBuild — Inventaire des applications & services", align="L")
        self.ln(2)
        self.set_draw_color(*LINE)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self) -> None:
        self.set_y(-14)
        self.set_font("Body", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, f"Confidentiel interne · {date.today().isoformat()} · page {self.page_no()}/{{nb}}", align="C")

    def cover(self) -> None:
        self.add_page()
        self.set_fill_color(*BRAND)
        self.rect(0, 0, 210, 55, "F")
        self.set_xy(14, 18)
        self.set_font("Body", "B", 26)
        self.set_text_color(255, 255, 255)
        self.cell(0, 12, "KlirBuild", ln=1)
        self.set_x(14)
        self.set_font("Body", "", 13)
        self.cell(0, 8, "Inventaire des applications, services et outils", ln=1)

        self.set_xy(14, 70)
        self.set_text_color(30, 35, 40)
        self.set_font("Body", "B", 16)
        self.cell(0, 10, "Document de référence produit", ln=1)
        self.set_font("Body", "", 11)
        self.set_text_color(*MUTED)
        self.multi_cell(
            0,
            6,
            "Ce document regroupe tout ce qui compose le projet KlirBuild "
            "(par Klirline Inc.) : clients natifs, stack web, infrastructure, "
            "intégrations externes, modules métier et outils de développement. "
            "Objectif : un seul endroit pour savoir ce qui est à l'intérieur du projet.",
        )
        self.ln(4)
        self.set_font("Body", "", 10)
        self.set_text_color(30, 35, 40)
        rows = [
            ("Produit", "KlirBuild — AI Business / Construction OS"),
            ("Site live", "https://klirline.app"),
            ("Organisation", "Klirline Inc."),
            ("Package mobile", "app.klirline.klirbuild"),
            ("Date", date.today().isoformat()),
            ("Version doc", "1.0"),
        ]
        for k, v in rows:
            self.set_font("Body", "B", 10)
            self.cell(42, 7, k, border=0)
            self.set_font("Body", "", 10)
            self.cell(0, 7, v, ln=1)

        self.ln(8)
        self.set_fill_color(*ACCENT)
        self.rect(14, self.get_y(), 8, 3, "F")
        self.set_xy(26, self.get_y() - 1)
        self.set_font("Body", "", 9)
        self.set_text_color(*MUTED)
        self.cell(0, 5, "Usage interne — ne contient aucun secret (clés API, mots de passe).")

    def h1(self, title: str) -> None:
        self.ln(3)
        self.set_font("Body", "B", 14)
        self.set_text_color(*BRAND)
        self.cell(0, 9, title, ln=1)
        self.set_draw_color(*BRAND)
        self.set_line_width(0.4)
        self.line(10, self.get_y(), 70, self.get_y())
        self.ln(4)

    def h2(self, title: str) -> None:
        self.ln(2)
        self.set_font("Body", "B", 11)
        self.set_text_color(30, 35, 40)
        self.cell(0, 7, title, ln=1)

    def p(self, text: str) -> None:
        self.set_font("Body", "", 10)
        self.set_text_color(40, 45, 50)
        self.multi_cell(0, 5.2, text)
        self.ln(1)

    def bullet(self, text: str) -> None:
        self.set_font("Body", "", 10)
        self.set_text_color(40, 45, 50)
        x = self.get_x()
        self.cell(5, 5.2, "•")
        self.multi_cell(0, 5.2, text)
        self.set_x(x)

    def table(self, headers: list[str], rows: list[list[str]], widths: list[float]) -> None:
        self.set_font("Body", "B", 9)
        self.set_fill_color(*BRAND)
        self.set_text_color(255, 255, 255)
        for h, w in zip(headers, widths):
            self.cell(w, 7, h, border=0, fill=True)
        self.ln()
        self.set_text_color(35, 40, 45)
        self.set_font("Body", "", 8.5)
        fill = False
        for row in rows:
            # compute row height
            line_h = 4.6
            max_lines = 1
            for cell, w in zip(row, widths):
                lines = self.multi_cell(w, line_h, cell, dry_run=True, output="LINES")
                max_lines = max(max_lines, len(lines))
            h = max_lines * line_h + 1.5
            if self.get_y() + h > self.page_break_trigger:
                self.add_page()
                self.set_font("Body", "B", 9)
                self.set_fill_color(*BRAND)
                self.set_text_color(255, 255, 255)
                for hh, ww in zip(headers, widths):
                    self.cell(ww, 7, hh, border=0, fill=True)
                self.ln()
                self.set_text_color(35, 40, 45)
                self.set_font("Body", "", 8.5)
            y0 = self.get_y()
            x0 = self.get_x()
            if fill:
                self.set_fill_color(245, 248, 250)
                self.rect(x0, y0, sum(widths), h, "F")
            self.set_xy(x0, y0 + 0.8)
            for cell, w in zip(row, widths):
                cx = self.get_x()
                cy = self.get_y()
                self.multi_cell(w, line_h, cell)
                self.set_xy(cx + w, cy)
            self.set_xy(x0, y0 + h)
            fill = not fill
        self.ln(2)


def build_markdown() -> str:
    return f"""# KlirBuild — Inventaire des applications & services

> Généré le {date.today().isoformat()} · Document interne · Sans secrets

## 1. Vue d'ensemble

| Élément | Valeur |
|--------|--------|
| Produit | KlirBuild (AI Business / Construction OS) |
| Éditeur | Klirline Inc. |
| Site live | https://klirline.app |
| Package mobile | `app.klirline.klirbuild` |
| Hébergement principal | Cloudflare Workers (OpenNext) |

## 2. Applications clients (ce que l'utilisateur installe / ouvre)

| Application | Techno | Dossier | Artefacts | Rôle |
|-------------|--------|---------|-----------|------|
| Web app | Next.js 15 + React 19 | `src/` | Deploy Workers | Source de vérité — https://klirline.app |
| PWA | Service Worker + manifest | `public/sw.js` | Navigateur | « Installer l'app » sur mobile/desktop |
| Windows desktop | Tauri 2 | `apps/desktop` | `KlirBuild-setup.exe`, `KlirBuild.exe` | Shell natif → klirline.app |
| Android | Capacitor 7 | `apps/android` | `KlirBuild-release.apk`, `.aab` | Shell natif Android / Play Store |
| iOS | Capacitor 7 | `apps/ios` | IPA (macOS) | Shell natif iOS (scaffold) |

Téléchargements publics : https://klirline.app/download

## 3. Infrastructure & hébergement

| Service | Usage |
|---------|-------|
| Cloudflare Workers | Runtime production (OpenNext) |
| Cloudflare KV | Uploads, backups, cache Next (`UPLOADS_KV`, `BACKUPS_KV`, `NEXT_INC_CACHE_KV`) |
| Cloudflare Images | Optimisation images |
| Cloudflare DNS / domaine | klirline.app |
| Wrangler | CLI deploy / secrets |
| OpenNext (`@opennextjs/cloudflare`) | Adapter Next.js → Workers |
| Netlify (legacy) | Ancien chemin de deploy (`netlify.toml`) |
| Vercel / AWS Amplify | Docs de déploiement alternatives |

## 4. Base de données & stockage

| Service | Usage |
|---------|-------|
| PostgreSQL (Supabase / Neon-compatible) | Données métier via `DATABASE_URL` |
| Prisma ORM | Schéma, migrations, client |
| `@prisma/adapter-pg` + `pg` | Driver Postgres |

## 5. Authentification & sécurité

| Élément | Usage |
|---------|-------|
| Session cookies (`klirline_session`) | Auth maison (secret `BETTER_AUTH_SECRET`) |
| Google OAuth | Bouton « Continuer avec Google » |
| 2FA TOTP | Vérification optionnelle |
| Middleware Next | Routes protégées / publiques |
| Platform admin | `admin@klirline.ca` |

## 6. Paiements & abonnements

| Service | Usage |
|---------|-------|
| Stripe | Checkout abonnements, portail, webhooks |
| Plans | Starter / Growth / Business (mensuel + annuel CAD) |
| Endpoint | `/api/stripe/checkout`, `/api/stripe/webhook`, `/billing` |

## 7. Courriel

| Service | Usage |
|---------|-------|
| Resend | Emails transactionnels (invites, billing) |
| Cloudflare Email Routing | Forward inbound `inbox.*` |
| Domaine inbound | `inbox.klirline.ca` |

## 8. Intelligence artificielle

| Service | Usage / priorité |
|---------|------------------|
| OpenAI | Priorité 1 si `OPENAI_API_KEY` |
| OpenRouter | Priorité 2 (modèles free) |
| Google Gemini | Priorité 3 (`GEMINI_API_KEY`) |
| Mock local | Fallback sans clé |

Module app : `/ai` (Klir AI chat)

## 9. Visio & réunions

| Service | Usage |
|---------|-------|
| WebRTC natif KlirBuild | Salles in-page (`/meetings`, signaling `/api/rtc`) |
| Jitsi Meet (public) | Fallback iframe (`meet.ffmuc.net`) |
| Daily.co | Option premium (`DAILY_API_KEY`) |

## 10. Marketing & publicité

| Service | Usage |
|---------|-------|
| Zernio | Multi-publish réseaux sociaux (`ZERNIO_API_KEY`) |
| Ads sponsorisées in-app | `/ads/sponsor` + dashboard |
| Social Ads UI | `/social-ads` |
| Live social RTMP | Connexions YT/FB/TikTok/IG dans réunions |

## 11. Modules métier dans l'application

Routes principales sous `src/app/(app)/` :

- Dashboard, CRM, Clients, Devis, Factures, Paiements
- Projets / Tasks / Kanban
- Construction OS (CCQ, chantier, etc.)
- Comptabilité, Paie, Timeclock
- Documents (DMS), Inbox email, Team chat
- Meetings / Visio, Presence, Feed
- Analytics, Automations, Auto-pilot
- AI chat, Help / tutoriels
- Billing / Settings / Profile / Admin plateforme
- Social Ads, Sponsored Ads, Compliance, Reports

Modules registry (`src/modules/registry.ts`) : Cleaning, Construction, Restaurant, Medical, Retail, Education, Legal, Manufacturing OS.

## 12. Stack frontend / libraries

Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query, Zod, React Hook Form, Recharts, Lucide, next-themes, class-variance-authority, clsx, date-fns, Stripe SDK.

## 13. Outils de développement & qualité

| Outil | Usage |
|-------|-------|
| Vitest | Tests unitaires |
| Playwright | E2E |
| ESLint | Lint |
| GitHub Actions | CI (native apps, Play publish) |
| googleapis | Upload Play Store (`scripts/play-upload.mjs`) |
| tsx | Scripts TypeScript |
| Rust / cargo-xwin | Build Windows Tauri (cross) |
| Android Studio / Gradle / JDK | Build APK/AAB |

## 14. URLs utiles

- App : https://klirline.app
- Login : https://klirline.app/login
- Download : https://klirline.app/download
- Billing : https://klirline.app/billing
- Health : https://klirline.app/api/health
- Worker : https://klirbuild.pipoxdavensonazor.workers.dev

## 15. Variables d'environnement (noms seulement)

Core : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `PLATFORM_ADMIN_*`, `CRON_SECRET`

Stripe : `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`

Email : `RESEND_API_KEY`, `EMAIL_FROM`, `INBOUND_EMAIL_DOMAIN`

IA : `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`

Auth Google : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

Visio : `DAILY_API_KEY`, `NEXT_PUBLIC_DAILY_DOMAIN`, `NEXT_PUBLIC_JITSI_HOST`

Ads : `ZERNIO_API_KEY`

Play : `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
"""


def build_pdf() -> None:
    pdf = InventoryPDF()
    pdf.alias_nb_pages()
    pdf.cover()

    pdf.add_page()
    pdf.h1("1. Applications clients")
    pdf.p(
        "L'application web est la source de vérité. Les apps Windows, Android et iOS "
        "sont des coques natives (wrappers) qui ouvrent https://klirline.app."
    )
    pdf.table(
        ["Application", "Techno", "Dossier / sortie"],
        [
            ["Web app (live)", "Next.js 15 + React 19", "src/ → Cloudflare Workers"],
            ["PWA", "Service Worker + manifest", "public/sw.js — installable navigateur"],
            ["Windows", "Tauri 2", "apps/desktop → KlirBuild-setup.exe / .exe"],
            ["Android", "Capacitor 7", "apps/android → APK + AAB Play Store"],
            ["iOS", "Capacitor 7", "apps/ios → IPA (build macOS)"],
        ],
        [48, 48, 94],
    )
    pdf.p("Page téléchargement : https://klirline.app/download")
    pdf.bullet("Package Android / iOS / desktop : app.klirline.klirbuild")
    pdf.bullet("Installateur Windows NSIS + binaire portable")
    pdf.bullet("APK sideload + AAB pour Google Play Console")

    pdf.h1("2. Infrastructure & hébergement")
    pdf.table(
        ["Service", "Rôle dans le projet"],
        [
            ["Cloudflare Workers", "Hébergement production (OpenNext)"],
            ["Cloudflare KV", "Uploads, backups, cache incremental Next"],
            ["Cloudflare Images", "Transformation / delivery images"],
            ["Cloudflare DNS", "Domaine klirline.app"],
            ["Wrangler CLI", "Deploy, secrets, types Workers"],
            ["OpenNext Cloudflare", "Bridge Next.js App Router → Workers"],
            ["Netlify (legacy)", "Ancien chemin deploy encore documenté"],
            ["AWS Amplify / Vercel", "Options documentées, non utilisées en live"],
        ],
        [55, 135],
    )

    pdf.h1("3. Base de données & fichiers")
    pdf.table(
        ["Composant", "Détail"],
        [
            ["PostgreSQL", "Base principale via DATABASE_URL (ex. Supabase pooler)"],
            ["Prisma", "ORM, schéma prisma/, migrations, seed"],
            ["pg + adapter-pg", "Driver Postgres compatible Workers"],
            ["Workers KV", "Fichiers uploadés / artefacts admin"],
        ],
        [50, 140],
    )

    pdf.h1("4. Authentification")
    pdf.bullet("Sessions cookies signées (BETTER_AUTH_SECRET) — login email/mot de passe")
    pdf.bullet("Google OAuth (GOOGLE_CLIENT_ID / SECRET) — callback /api/auth/google/callback")
    pdf.bullet("2FA TOTP optionnelle")
    pdf.bullet("Rôles multi-tenant : COMPANY_ADMIN, employés, platform admin")
    pdf.bullet("Compte démo : alex@klirline.demo (environnement démo)")

    pdf.h1("5. Paiements (Stripe)")
    pdf.p(
        "Stripe gère les abonnements SaaS (Checkout + Customer Portal + webhooks). "
        "Plans : Starter, Growth, Business — mensuel et annuel (CAD)."
    )
    pdf.bullet("UI : /billing")
    pdf.bullet("API : /api/stripe/checkout, /api/stripe/portal, /api/stripe/webhook, /api/stripe/status")
    pdf.bullet("SDK : stripe (Node) avec Fetch HTTP client pour Workers")

    pdf.h1("6. Courriel")
    pdf.table(
        ["Service", "Usage"],
        [
            ["Resend", "Envoi transactionnel (invitations, billing)"],
            ["Cloudflare Email Routing", "Réception / forward inbound"],
            ["Domaine inbox", "inbox.klirline.ca → boîte entreprise"],
        ],
        [55, 135],
    )

    pdf.h1("7. Intelligence artificielle")
    pdf.p("Chaîne de providers dans le code : OpenAI → OpenRouter → Gemini → mock local.")
    pdf.table(
        ["Provider", "Variable", "Notes"],
        [
            ["OpenAI", "OPENAI_API_KEY", "Priorité 1 (payant)"],
            ["OpenRouter", "OPENROUTER_API_KEY", "Priorité 2 — modèles free possibles"],
            ["Google Gemini", "GEMINI_API_KEY", "Priorité 3 — AI Studio"],
            ["Mock", "—", "Réponses locales si aucune clé"],
        ],
        [45, 55, 90],
    )

    pdf.add_page()
    pdf.h1("8. Visio & réunions")
    pdf.table(
        ["Solution", "Usage"],
        [
            ["WebRTC natif KlirBuild", "Salles in-page, partage écran, signaling /api/rtc"],
            ["Jitsi Meet (ffmuc.net)", "Fallback public si pas de Daily"],
            ["Daily.co", "Option premium (DAILY_API_KEY + domaine)"],
            ["Live social RTMP", "Annonces / clés YouTube, Facebook, TikTok, Instagram"],
        ],
        [55, 135],
    )

    pdf.h1("9. Marketing & publicité")
    pdf.bullet("Zernio — publication multi-réseaux (/social-ads) si ZERNIO_API_KEY")
    pdf.bullet("Publicités sponsorisées in-app (/ads/sponsor) avec approbation admin")
    pdf.bullet("Connexions live sociales dans les réunions")

    pdf.h1("10. Modules métier (fonctionnalités app)")
    pdf.p("Routes principales disponibles dans le shell connecté :")
    modules = [
        "Dashboard · CRM · Clients · Devis · Factures · Paiements",
        "Projets · Tâches / Kanban · Construction OS (CCQ, chantiers)",
        "Comptabilité · Paie · Pointage (timeclock) · Conformité",
        "Documents DMS · Inbox email · Team chat · Presence · Feed",
        "Meetings / Visio · Analytics · Automations · Auto-pilot",
        "Klir AI · Aide / tutoriels · Billing · Settings · Admin plateforme",
        "Social Ads · Ads sponsorisées · Rapports · Markets · Locations",
    ]
    for m in modules:
        pdf.bullet(m)

    pdf.h2("Business OS (registry)")
    pdf.p(
        "Modules sectoriels déclarés dans src/modules/registry.ts : "
        "Cleaning, Construction (actif par défaut), Restaurant, Medical, "
        "Retail, Education, Legal, Manufacturing."
    )

    pdf.h1("11. Bibliothèques frontend clés")
    pdf.table(
        ["Lib", "Rôle"],
        [
            ["Next.js 15 / React 19", "App Router, UI"],
            ["TypeScript", "Typage"],
            ["Tailwind CSS", "Design system utilitaire"],
            ["Zustand / TanStack Query", "État client / data fetching"],
            ["Zod + React Hook Form", "Validation formulaires"],
            ["Recharts", "Graphiques analytics"],
            ["Lucide", "Icônes"],
            ["next-themes", "Thème clair/sombre"],
            ["Stripe SDK", "Checkout / abonnements"],
        ],
        [60, 130],
    )

    pdf.h1("12. Outils de développement")
    pdf.table(
        ["Outil", "Usage"],
        [
            ["Vitest", "Tests unitaires"],
            ["Playwright", "Tests E2E"],
            ["ESLint + eslint-config-next", "Qualité code"],
            ["GitHub Actions", "CI native apps + Play publish"],
            ["googleapis", "Upload AAB Google Play"],
            ["tsx", "Exécution scripts TS"],
            ["Rust + Tauri CLI", "Build Windows"],
            ["Android Studio / Gradle / JDK", "Build APK / AAB"],
            ["Xcode (macOS)", "Build iOS IPA"],
        ],
        [70, 120],
    )

    pdf.h1("13. URLs de référence")
    urls = [
        "https://klirline.app — application",
        "https://klirline.app/login — connexion",
        "https://klirline.app/download — installateurs",
        "https://klirline.app/billing — abonnements",
        "https://klirline.app/api/health — santé systèmes",
        "https://klirbuild.pipoxdavensonazor.workers.dev — Worker Cloudflare",
    ]
    for u in urls:
        pdf.bullet(u)

    pdf.h1("14. Secrets / variables (noms uniquement)")
    pdf.p(
        "Les valeurs ne sont PAS dans ce document. Elles vivent dans "
        "wrangler secrets / .env.local."
    )
    pdf.bullet("Core : DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, CRON_SECRET")
    pdf.bullet("Stripe : STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*")
    pdf.bullet("Email : RESEND_API_KEY, EMAIL_FROM, INBOUND_EMAIL_DOMAIN")
    pdf.bullet("IA : OPENAI_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY")
    pdf.bullet("Google : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET")
    pdf.bullet("Visio : DAILY_API_KEY, NEXT_PUBLIC_DAILY_DOMAIN, NEXT_PUBLIC_JITSI_HOST")
    pdf.bullet("Ads / Play : ZERNIO_API_KEY, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")

    pdf.ln(6)
    pdf.set_font("Body", "B", 10)
    pdf.set_text_color(*BRAND)
    pdf.cell(0, 6, "Fin du document — KlirBuild / Klirline Inc.", ln=1)
    pdf.set_font("Body", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(
        0,
        5,
        "Pour mettre à jour ce PDF : python3 scripts/generate-inventory-pdf.py "
        "puis redéployer. Sources : package.json, apps/*, FREE-STACK.md, "
        ".env.example, modules/registry.ts.",
    )

    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT_PDF))
    OUT_PDF_DL.parent.mkdir(parents=True, exist_ok=True)
    OUT_PDF_DL.write_bytes(OUT_PDF.read_bytes())
    print(f"PDF → {OUT_PDF} ({OUT_PDF.stat().st_size} bytes)")
    print(f"PDF → {OUT_PDF_DL}")


def main() -> None:
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text(build_markdown(), encoding="utf-8")
    print(f"MD  → {OUT_MD}")
    build_pdf()


if __name__ == "__main__":
    main()
