# Klirline Core OS — Prompts Bolt.new (stratégie en 5 étapes)

> **Règle d’or :** ne pas coller les 15 modules Business OS au premier prompt.  
> Générer d’abord **Klirline Core MVP**, puis enrichir.

---

## Prompt 1 — Interface complète (UI only + mock data)

```text
Build Klirline Core OS MVP — FRONTEND ONLY (no real auth, DB, Stripe, or OpenAI yet).

PRODUCT
Klirline Core OS is a premium AI Business Operating System for SMBs.
Visual inspiration: Stripe + Notion + Linear + Vercel.
Must feel production-ready, fast, clean, and modern.

TECH STACK
- Next.js 15 App Router
- React + TypeScript
- TailwindCSS
- shadcn/ui
- Lucide icons
- Recharts for charts
- Zustand for UI state
- Mock data in /lib/mock-data (realistic demo data)

DESIGN SYSTEM
- Primary: #004F6E
- Accent: #D4AF37
- Background: white + light gray
- Dark mode supported
- Soft shadows, rounded corners, modern typography
- No purple gradients, no generic AI look
- Responsive: desktop, tablet, mobile

APP SHELL
- Collapsible left sidebar
- Top bar with search + command palette (Cmd+K) + notifications + user menu
- Breadcrumbs
- Loading states + empty states for every list page

SIDEBAR NAV
Dashboard, CRM, Clients, Quotes, Invoices, Payments, Projects, Tasks, Documents, AI Assistant, Reports, Settings

PAGES TO BUILD (all routes working with mock data)

1) /dashboard
- KPI cards: Revenue, Invoices, Clients, Projects, Tasks
- Revenue chart
- Recent activity feed
- Quick actions
- Upcoming calendar widget
- AI summary card (static placeholder text)

2) /clients
- Table with search, filters, status
- Create / Edit / Delete via dialogs
- /clients/[id] details: notes, attachments list, timeline

3) /quotes
- List + create/edit forms
- Status: draft, sent, approved, rejected
- PDF preview placeholder
- Actions: Approve, Reject, Convert to Invoice

4) /invoices
- List + create/edit
- Status: paid, pending, cancelled, overdue
- PDF generate placeholder
- Send invoice placeholder

5) /payments
- Payment history table
- Subscription/billing placeholder cards
- Stripe placeholder UI (not wired)

6) /projects
- Project list + detail
- Kanban board for tasks
- Members + progress

7) /tasks
- Task list + filters
- Calendar view toggle

8) /documents
- Folders, upload UI, preview, download, search (mock)

9) /ai
- Chat window UI
- Prompt input
- Suggested actions + example prompts
- OpenAI placeholder (no API calls)

10) /reports
- Simple charts + export placeholder

11) /settings
- Tabs: Company Profile, Users, Roles, Permissions, Branding, Notifications, Security, Subscription, API Keys
- Forms with validation UI (React Hook Form + Zod schemas, but save to mock/local state only)

COMPONENTS
Reusable: DataTable, StatCard, PageHeader, EmptyState, StatusBadge, ConfirmDialog, FormSheet, ChartCard, CommandPalette, Sidebar, Breadcrumb

CODE QUALITY
- Strong TypeScript types in /types
- Clean folder structure: app/, components/, lib/, types/, hooks/
- No duplicated UI patterns
- Sample realistic French-Canadian / bilingual-ready labels in English for now (easy to i18n later)

GOAL
Ship a complete clickable SaaS UI MVP with demo data. Do not implement real backend yet.
```

---

## Prompt 2 — Auth + Database (Prisma + PostgreSQL)

```text
Continue the existing Klirline Core OS project.

OBJECTIVE
Add real authentication and database persistence. Keep the current UI. Replace mock data gradually with Prisma-backed APIs.

TECH
- Prisma ORM + PostgreSQL
- Better Auth (preferred) OR Clerk if Better Auth is blocked
- Email/password + Google OAuth
- Next.js API routes / server actions
- TanStack Query for client data fetching
- Zod validation on all inputs

MULTI-TENANCY
Every business record belongs to a Company.
Users belong to a Company with a role.

ROLES
- SUPER_ADMIN
- COMPANY_ADMIN
- MANAGER
- EMPLOYEE

PRISMA MODELS (minimum)
Company, User, Session/Account (per auth lib), Client, Quote, QuoteItem, Invoice, InvoiceItem, Payment, Project, Task, Document, Notification

RULES
- Soft delete where useful (clients, documents)
- createdAt / updatedAt everywhere
- Indexes on companyId + status + createdAt
- Cascade carefully (company delete is admin-only)

FEATURES TO IMPLEMENT
1) Auth pages: /login, /register, /forgot-password
2) Protected app layout (redirect unauthenticated users)
3) Company onboarding after first signup (create company profile)
4) CRUD APIs for: Clients, Quotes, Invoices, Projects, Tasks, Documents metadata
5) Seed script with realistic demo data for one demo company
6) Replace dashboard KPIs with real aggregated queries
7) Role-based UI guards (hide admin settings for EMPLOYEE)

DO NOT
- Do not rebuild the UI from scratch
- Do not add Stripe or OpenAI yet
- Do not add extra Business OS modules

DELIVERABLES
- prisma/schema.prisma
- seed script
- auth config
- API routes / server actions
- env example (.env.example) with DATABASE_URL, auth secrets, Google OAuth placeholders
```

---

## Prompt 3 — Stripe (Checkout + Billing)

```text
Continue Klirline Core OS.

OBJECTIVE
Integrate Stripe Checkout and Stripe Billing for SaaS subscriptions and invoice payments.

SCOPE
1) SaaS subscription for Klirline itself
   - Plans: Starter, Growth, Business (placeholder pricing)
   - Stripe Checkout for upgrade
   - Customer Portal for manage billing
   - Webhook: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid

2) Client invoice payments
   - "Pay invoice" button creates Stripe Checkout session for that invoice amount
   - On success webhook: mark invoice PAID + create Payment record

DATA MODEL UPDATES
- Company: stripeCustomerId, stripeSubscriptionId, plan, subscriptionStatus
- Payment: stripeSessionId, stripePaymentIntentId, amount, currency, status, invoiceId
- Invoice: paidAt, stripeCheckoutSessionId

UI
- Settings > Subscription: current plan, upgrade CTA, manage billing
- Invoice detail: Pay now button (if pending)
- Payments page: real payment history from DB

SECURITY
- Verify Stripe webhook signatures
- Never trust client-side payment success alone
- Keep secret keys server-side only

DO NOT
- Do not redesign the app
- Do not add OpenAI yet
- Provide .env.example keys: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, price IDs
```

---

## Prompt 4 — OpenAI + AI Assistant

```text
Continue Klirline Core OS.

OBJECTIVE
Integrate OpenAI into the AI Assistant page and add lightweight AI helpers across Core modules.

FEATURES
1) /ai chat
   - Persist chat threads per company/user (ChatThread, ChatMessage models)
   - Stream responses if possible
   - Suggested actions:
     - Summarize overdue invoices
     - Draft follow-up email for a client
     - Create task from natural language
     - Weekly business summary

2) Contextual AI cards
   - Dashboard AI Summary: real summary from company metrics
   - Client detail: "AI insights" panel (placeholder-safe if no data)

3) Tool-style actions (MVP)
   - From AI chat, allow creating a Task or drafting a Quote note (confirm before write)

IMPLEMENTATION
- OpenAI API via server route only
- System prompt: Klirline business copilot, concise, actionable, no hallucination of missing financial data
- Rate limit per user/company (simple in-memory or DB counter for MVP)
- Zod-validate requests
- Store token usage lightly if easy

UI
- Keep existing chat UI
- Add streaming indicator
- Example prompts clickable
- Error/empty states

DO NOT
- Do not rebuild UI
- Do not add new Business OS vertical modules
- Add OPENAI_API_KEY to .env.example
```

---

## Prompt 5 — Architecture modulaire (Core + futurs Business OS)

```text
Continue Klirline Core OS.

OBJECTIVE
Refactor into a modular architecture so future industry modules can plug into Core without rewriting the app.

TARGET STRUCTURE
/core
  - auth, billing, companies, users, permissions
  - clients, quotes, invoices, payments
  - projects, tasks, documents
  - ai, notifications, settings
/modules
  - _registry.ts (module manifest)
  - (empty stubs ready for later):
    - cleaning/
    - construction/
    - clinics/
    - restaurants/
    - professional-services/
    - etc. (stubs only, not full apps)

MODULE CONTRACT
Each module exports:
- id, name, description
- navigation items
- routes
- permissions
- optional dashboard widgets
- enabled: boolean (feature flag per company)

CORE REQUIREMENTS
1) Module registry + feature flags on Company (enabledModules: string[])
2) Sidebar reads from Core nav + enabled modules
3) Permission helper: can(user, permission)
4) Shared UI primitives stay in /components/ui and /components/shared
5) Domain logic separated from UI (lib/services or server modules)
6) Keep current features working after refactor
7) Add a Settings > Modules page to enable/disable stubs
8) README section explaining how to add a new Business OS module

DO NOT
- Do not implement full industry modules yet
- Do not break existing Core routes
- Keep TypeScript strict and architecture clean

GOAL
Klirline Core becomes the stable platform kernel. Future Business OS modules can be added one by one.
```

---

## Ordre d’exécution recommandé

| Étape | Prompt | Résultat attendu |
|------|--------|------------------|
| 1 | UI + mock data | App cliquable premium |
| 2 | Auth + Prisma + Postgres | Données réelles + login |
| 3 | Stripe | Abonnements + paiements factures |
| 4 | OpenAI | Assistant IA utile |
| 5 | Modularisation | Base scalable Business OS |

## Conseils Bolt

1. Après chaque prompt, **tester** avant le suivant.
2. Si Bolt dérive, renvoyer : `Do not redesign. Extend the existing codebase only.`
3. Exporter vers GitHub dès que le Prompt 1 est stable.
4. Ne demander les modules métiers (Cleaning, Construction, etc.) **qu’après** le Prompt 5.
```
