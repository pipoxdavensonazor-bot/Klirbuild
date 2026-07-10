# Klirline Core OS — Série de 12 prompts Bolt.new

> **Objectif :** construire ~80–90 % de Klirline Core via Bolt, en prompts spécialisés.  
> **Règle d’or :** un prompt = un domaine. Tester avant de passer au suivant.  
> **Anti-dérive (à renvoyer si besoin) :** `Do not redesign. Extend the existing codebase only. Keep current routes and design system.`

### Stack figée (tous les prompts)

- Next.js 15 App Router · React · TypeScript · TailwindCSS · shadcn/ui  
- React Hook Form · Zod · TanStack Query · Zustand  
- Prisma · PostgreSQL  
- Better Auth (ou Clerk si bloqué) · Stripe · OpenAI (plus tard)  
- Design : Primary `#004F6E` · Accent `#D4AF37` · white/light gray · dark mode  

### Ordre d’exécution

| # | Domaine | Dépend de |
|---|---------|-----------|
| 1 | UI shell + mock data | — |
| 2 | Auth + multi-tenant | 1 |
| 3 | CRM | 1–2 |
| 4 | Quotes & Invoices | 1–3 |
| 5 | Stripe Billing | 2 + 4 |
| 6 | Projects & Tasks | 1–2 |
| 7 | Klir AI | 1–2 |
| 8 | Automations | 2–4, 6 |
| 9 | Analytics | 3–6 |
| 10 | Documents | 2 |
| 11 | Settings | 2–5 |
| 12 | Architecture finale / modularité | tout |

---

## PROMPT 1 — UI SHELL + DASHBOARD (mock data)

```text
Build Klirline Core OS — FRONTEND FOUNDATION ONLY.

PRODUCT
Premium AI Business Operating System for SMBs.
Inspiration: Stripe + Notion + Linear + Vercel.
Production-ready look, responsive, fast.

TECH
Next.js 15 App Router, React, TypeScript, TailwindCSS, shadcn/ui, Lucide, Recharts, Zustand.
Mock data in /lib/mock-data. No real auth, DB, Stripe, or OpenAI yet.

DESIGN
Primary #004F6E, Accent #D4AF37, white + light gray, dark mode.
Soft shadows, rounded corners, modern typography.
No purple gradients. No generic AI aesthetic.

APP SHELL
- Collapsible sidebar
- Top bar: global search, Cmd+K command palette, notifications, user menu
- Breadcrumbs
- Loading + empty states

SIDEBAR NAV (routes must work)
Dashboard, CRM, Clients, Quotes, Invoices, Payments, Projects, Tasks, Documents, AI Assistant, Automations, Analytics, Settings

PAGES (mock data)
1) /dashboard — KPI cards, revenue chart, recent activity, quick actions, calendar widget, AI summary placeholder
2) Placeholder list pages for each nav item with PageHeader + EmptyState or demo tables
3) Consistent layout under (app)/(dashboard)/...

COMPONENTS
DataTable, StatCard, PageHeader, EmptyState, StatusBadge, ConfirmDialog, ChartCard, CommandPalette, AppSidebar, Breadcrumb

CODE QUALITY
/types, /components, /lib, /hooks — strong TypeScript, no duplicated UI patterns.

GOAL
Clickable premium SaaS shell. Do not implement backend yet.
```

---

## PROMPT 2 — AUTHENTIFICATION & MULTI-TENANT

```text
Continue Klirline Core OS. Do not redesign the UI. Extend the existing codebase only.

OBJECTIVE
Add production-ready authentication and multi-tenant access control.

AUTH
- Better Auth preferred (Clerk acceptable if Better Auth is blocked)
- Email/password
- Google OAuth
- Email verification
- Password reset
- Secure sessions (httpOnly cookies / Better Auth sessions — avoid fragile custom JWT if the auth library already handles sessions)

MULTI-TENANT
- Every user belongs to exactly one Company (MVP)
- Company owner is COMPANY_ADMIN on signup
- Invite users by email (invite token, accept invite flow)
- User profile + Company profile pages

ROLES
SUPER_ADMIN, COMPANY_ADMIN, MANAGER, EMPLOYEE

PERMISSIONS
- Middleware-based route protection
- Server-side permission checks on mutations
- Helper: can(user, permission)
- Hide/disable UI actions the role cannot perform

PRISMA MODELS
Company, User, Role, Permission, RolePermission, Session (or auth-lib tables), Invitation, AuditLog (basic)

FEATURES
1) /login /register /forgot-password /reset-password /verify-email /invite/[token]
2) Protected app layout — redirect unauthenticated users
3) Onboarding: create company on first register
4) Settings stubs: Users list, invite form, role assignment
5) Seed: 1 demo company + users for each role
6) .env.example with DATABASE_URL, auth secrets, Google OAuth placeholders

DO NOT
- Do not rebuild pages from scratch
- Do not add Stripe or OpenAI
- Do not implement full CRM yet

GOAL
Secure multi-tenant auth foundation ready for all modules.
```

---

## PROMPT 3 — CRM COMPLET

```text
Continue Klirline Core OS. Do not redesign. Extend existing code only. All data scoped by companyId.

OBJECTIVE
Build a complete CRM module on top of auth + Prisma.

ENTITIES
Lead, Customer (Client), Contact, CompanyAccount (optional B2B account), Deal/Opportunity, Tag, Note, Attachment metadata, Activity, Meeting, CrmTask

FEATURES
- Lead management (status, source, score placeholder)
- Customer management (CRUD)
- Contacts linked to customers
- Sales pipeline Kanban (deal stages)
- Search, filters, tags
- Notes, attachments list, timeline, activity history
- Tasks + meetings linked to customer/lead/deal

CUSTOMER DETAIL /clients/[id] TABS
Personal/company info | Documents | Invoices | Quotes | Projects | Tasks | Emails (placeholder) | Payments | Activity log

PAGES
/crm (overview stats)
/crm/leads
/crm/pipeline
/clients
/clients/[id]
/contacts

ALSO
- Dashboard CRM widgets (new leads, pipeline value, conversion placeholder)
- Full CRUD with Zod validation + TanStack Query
- Empty/loading/error states

DO NOT
- Do not implement PDF invoicing yet (link placeholders OK)
- Do not add Stripe/OpenAI/Automations

GOAL
Production-quality CRM with pipeline + rich customer 360 page.
```

---

## PROMPT 4 — DEVIS & FACTURATION

```text
Continue Klirline Core OS. Do not redesign. Extend existing code only. Scope by companyId.

OBJECTIVE
Professional Quotes & Invoices module.

QUOTES
Create/edit/list, line items, taxes, discounts, multi-currency (CAD/USD/EUR MVP)
Statuses: draft, sent, approved, rejected, expired, converted
Convert Quote → Invoice
PDF preview/generation (react-pdf or similar)
Email send placeholder (UI + server stub)

INVOICES
Create/edit/list, line items, taxes, discounts, multi-currency
Statuses: draft, sent, pending, paid, overdue, cancelled
Recurring invoices (schedule model + nextRunAt; runner can be stub/cron placeholder)
Templates (basic branding from company profile)
Payment status + customer payment history view
Revenue widgets on module dashboard

DATA
Prisma: Quote, QuoteItem, Invoice, InvoiceItem, TaxRate, RecurringInvoice, Payment (basic, Stripe later)
API routes or server actions + Zod
Link invoices/quotes to Client from CRM

UI
Modern tables, filters, status badges, detail pages, charts for revenue

DO NOT
- Do not fully wire Stripe webhooks yet (Pay button can be placeholder)
- Do not rebuild CRM

GOAL
Billing-ready quotes/invoices with PDF and convert-to-invoice.
```

---

## PROMPT 5 — STRIPE BILLING

```text
Continue Klirline Core OS. Do not redesign. Extend existing code only.

OBJECTIVE
Integrate Stripe Billing for (1) Klirline SaaS subscriptions and (2) optional client invoice checkout.

SAAS SUBSCRIPTIONS
- Plans: Starter, Growth, Business
- Monthly + yearly prices
- Checkout
- Customer Portal
- Trial period
- Upgrade / downgrade / cancel
- Usage tracking placeholder (seats or invoices count)
- Admin billing dashboard (company subscription status)

CLIENT INVOICE PAYMENTS
- Pay invoice via Stripe Checkout
- On success: mark invoice paid + Payment record

WEBHOOKS
Verify signatures. Handle:
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed

DATA
Company: stripeCustomerId, stripeSubscriptionId, plan, subscriptionStatus, trialEndsAt
Payment: stripe ids, amount, currency, status, invoiceId?
Invoice: paidAt, stripeCheckoutSessionId

UI
Settings > Subscription
Invoice detail > Pay now
Payments history page (real DB)
Billing admin widgets

SECURITY
Secrets server-side only. Never trust client-only success redirects.

ENV
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, price IDs in .env.example

DO NOT
- Do not add OpenAI
- Do not redesign billing UI from scratch — extend Settings/Payments

GOAL
Production-ready Stripe subscription + invoice payment flow.
```

---

## PROMPT 6 — GESTION DE PROJETS

```text
Continue Klirline Core OS. Do not redesign. Extend existing code only. Scope by companyId.

OBJECTIVE
Project Management module.

FEATURES
Projects CRUD, members, status, progress %
Tasks: assignees, due dates, priority, labels
Kanban board (drag status columns)
Calendar view
Gantt placeholder (visual stub, not full scheduling engine)
Time tracking (simple entries: hours + note)
Comments, attachments metadata
Milestones
Activity timeline
Notifications (in-app records)
Project dashboard widgets

PAGES
/projects
/projects/[id] (overview, board, list, calendar, files, activity)
/tasks (global task inbox)

COMPONENTS
KanbanBoard, TaskCard, MilestoneList, TimeEntryForm, ProjectProgress — reusable

LINK
Optional link Project ↔ Client from CRM

DO NOT
- Do not build a full Jira clone
- Do not add Automations/AI yet

GOAL
Solid PM MVP with Kanban + calendar + time tracking.
```

---

## PROMPT 7 — KLIR AI (assistant)

```text
Continue Klirline Core OS. Do not redesign. Extend existing code only.

OBJECTIVE
Create Klir AI — business assistant UI + architecture ready for OpenAI function calling.

UI
- /ai page: ChatGPT-like interface
- Conversation history (threads)
- Suggested prompts + quick commands
- Analytics summary card (can use real metrics if available, else mock)
- Floating AI button (global) opening a slide-over chat
- Integrate with existing Cmd+K command palette (AI actions group)
- Tool execution placeholder panel (show tool name + args + result stub)

ARCHITECTURE
- ChatThread, ChatMessage models (per company/user)
- Server route /api/ai/chat
- Provider adapter interface: AiProvider with OpenAI implementation behind feature flag
- If OPENAI_API_KEY missing: deterministic mock responses (still useful demo)
- Prepare function-calling registry placeholders:
  summarizeOverdueInvoices, draftClientEmail, createTask, weeklyBusinessSummary
- Confirm-before-write for any mutating tool

DO NOT
- Do not hardcode secrets
- Do not invent financial numbers when data is missing
- Do not build Automations module here

GOAL
Modern Klir AI UX + pluggable tool-calling architecture.
```

---

## PROMPT 8 — AUTOMATISATION

```text
Continue Klirline Core OS. Do not redesign. Extend existing code only. Scope by companyId.

OBJECTIVE
Automation Builder MVP for Klirline Core.

CONCEPTS
Workflow = Trigger + Conditions + Actions
Execution logs + run history

TRIGGERS (MVP)
- Lead created / stage changed
- Invoice overdue
- Quote approved
- Task due soon
- Payment received

CONDITIONS
Simple field operators: equals, not_equals, greater_than, contains, is_empty

ACTIONS
Send email (stub/provider interface)
Create task
Update lead/deal stage
Create notification
Invoice reminder (email stub)

UI
/automations — dashboard (active workflows, recent runs)
/automations/new and /automations/[id] — visual builder
Drag-and-drop or structured step list (keep reliable over fancy if needed)
Enable/disable workflow
Execution logs table

DATA
Automation, AutomationStep, AutomationRun, AutomationRunLog

ENGINE
Server-side runner function that can be invoked from API or stub cron route /api/cron/automations
Idempotent-enough MVP logging

DO NOT
- Do not build a full Zapier clone
- Do not require external n8n
- Keep builder usable and typed

GOAL
Useful automation MVP with logs and core business triggers.
```

---

## PROMPT 9 — ANALYTICS

```text
Continue Klirline Core OS. Do not redesign. Extend existing code only. Scope by companyId.

OBJECTIVE
Analytics & Executive Dashboard module.

METRICS
Revenue, Sales pipeline, Customers/Leads, Projects, Tasks completion
Invoices (paid/pending/overdue)
MRR (from Stripe subscription data if present, else estimate placeholder)
Growth, conversion rates

UI
/analytics — Executive Dashboard
Filters: date range, module, status
Charts (Recharts): line, bar, funnel placeholder
AI Summary card (calls existing Klir AI summary endpoint or local heuristic)
Export CSV
Export PDF (summary report)

PERFORMANCE
Pre-aggregate where easy; avoid N+1; loading skeletons

DO NOT
- Do not invent a separate BI warehouse
- Do not break existing dashboards — enhance and link

GOAL
Clear executive analytics with export and AI summary.
```

---

## PROMPT 10 — DOCUMENTS

```text
Continue Klirline Core OS. Do not redesign. Extend existing code only. Scope by companyId.

OBJECTIVE
Document Management System MVP.

FEATURES
Folders (nested), upload, drag & drop
Preview (images/PDF when possible)
Version history (version number + replace file)
Download, search, tags
Permissions (company roles + optional share link stub)
Sharing UI placeholder
Activity log on file/folder
Storage dashboard (used vs limit placeholder)

STORAGE
Use local/S3-compatible abstraction:
- interface FileStorage
- local disk or Vercel Blob / S3 via env
Store metadata in Prisma: Folder, Document, DocumentVersion, DocumentShare

PAGES
/documents — explorer UI
Link documents on Client, Project, Invoice detail pages where placeholders exist

DO NOT
- Do not build full Google Drive clone
- Do not bypass company isolation

GOAL
Reliable DMS with versions, search, and storage overview.
```

---

## PROMPT 11 — PARAMÈTRES

```text
Continue Klirline Core OS. Do not redesign. Extend existing Settings UI into a complete module.

OBJECTIVE
Production Settings for Klirline Core.

SECTIONS / TABS
Company profile
Users & invitations
Roles & permissions matrix
Branding (logo, colors — apply to invoice PDF if possible)
Security (sessions, password change, 2FA placeholder)
Notifications preferences
API Keys (generate/revoke hashed keys)
Integrations (Stripe, Google, OpenAI status cards)
Languages (i18n-ready structure; EN default, FR ready)
Dark mode toggle (persist)
Subscription (reuse Stripe billing UI)
Audit logs viewer
Organization danger zone (transfer ownership placeholder)

RULES
COMPANY_ADMIN+ for sensitive tabs
EMPLOYEE: limited profile/notifications only
Zod forms + optimistic UI where safe

DO NOT
- Do not duplicate Users pages — consolidate
- Do not add new industry modules

GOAL
Complete, permission-aware Settings hub.
```

---

## PROMPT 12 — FINALISATION & ARCHITECTURE MODULAIRE

```text
Continue Klirline Core OS. Do not redesign visually unless required for consistency.

OBJECTIVE
Refactor into a production-ready, modular SaaS architecture that can grow into Klirline Business OS.

ARCHITECTURE
/core — auth, billing, companies, users, permissions, crm, quotes, invoices, payments, projects, tasks, documents, ai, automations, analytics, settings
/modules — registry + stubs ONLY:
  construction-os, restaurant-os, medical-os, retail-os, education-os, legal-os, manufacturing-os, cleaning-os (stubs)
/components/ui — shadcn primitives
/components/shared — reusable app components
/lib/services — domain services
/lib/api — API client abstraction
/hooks — reusable hooks

MODULE CONTRACT
Each module exports: id, name, description, nav items, routes, permissions, optional dashboard widgets, enabled flag
Company.enabledModules: string[]
Sidebar = Core nav + enabled module nav
Settings > Modules to toggle stubs

QUALITY PASS
- Strong TypeScript, remove duplication
- Responsive + accessibility basics (labels, focus, keyboard)
- Loading/error boundaries
- Env validation (e.g. zod env)
- Auth middleware consistency
- Dark mode polish
- Basic performance: dynamic imports for heavy charts/builders
- SEO for public marketing/login pages only
- README: structure, env setup, how to add a Business OS module

DO NOT
- Do not implement full industry OS modules yet
- Do not break existing Core features

GOAL
Stable Klirline Core kernel + clean extension points for future Business OS modules.
```

---

## Mode d’emploi Bolt

1. Coller **Prompt 1** dans un nouveau projet Bolt.  
2. Après chaque prompt : cliquer les routes critiques, corriger, **puis seulement** enchaîner.  
3. Si Bolt régénère tout : renvoyer la phrase anti-dérive.  
4. Exporter vers GitHub dès que le Prompt 1–2 est stable.  
5. Les modules métiers (Construction OS, etc.) viennent **après** le Prompt 12, un module à la fois.

## Suite recommandée (bibliothèque ~50 prompts)

Quand Core est stable, étendre avec des packs :

- UI/UX design system approfondi  
- OpenAPI / SDK développeur  
- Marketplace d’apps  
- Agents IA + mémoire + function calling avancé  
- Mobile (Expo)  
- Sécurité / DevOps / CI  
- Un pack par vertical : Construction, Restaurant, Medical, Retail, Education, Legal, Manufacturing, Cleaning  

Dis-moi si tu veux que je génère ensuite le **Pack 50 prompts** (index + prompts détaillés par domaine).
