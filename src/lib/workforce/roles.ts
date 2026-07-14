import type { Permission } from "@/types";

type WorkforcePermission =
  | "timeclock:use"
  | "timeclock:manage"
  | "payroll:read"
  | "payroll:manage"
  | "accounting:read"
  | "accounting:manage"
  | "chat:use"
  | "chat:moderate"
  | "location:view"
  | "meetings:join"
  | "meetings:host"
  | "posts:write"
  | "live:host";

export type AppPermission = Permission | WorkforcePermission;

/** Permissions accordées à TOUS les employés, sans exception. */
export const UNIVERSAL_EMPLOYEE_PERMISSIONS = [
  "timeclock:use",
  "chat:use",
  "meetings:join",
] as const satisfies readonly AppPermission[];

export type RoleCategory = "direction" | "chantier" | "bureau" | "support";

export type RoleDefinition = {
  labelFr: string;
  descriptionFr: string;
  category: RoleCategory;
  /** Permissions métier (hors chronomètre / chat universels). */
  permissions: Permission[];
  workforce: WorkforcePermission[];
};

const wf = (
  ...perms: WorkforcePermission[]
): WorkforcePermission[] => perms;

const base = (
  perms: Permission[],
  workforce: WorkforcePermission[] = []
): Pick<RoleDefinition, "permissions" | "workforce"> => ({
  permissions: perms,
  workforce,
});

/** Matrice des rôles — administration construction complète. */
export const ROLE_DEFINITIONS: Record<
  import("@/types").Role,
  RoleDefinition
> = {
  SUPER_ADMIN: {
    labelFr: "Super administrateur",
    descriptionFr: "Accès plateforme complet — Klirline Inc.",
    category: "direction",
    ...base(
      [
        "company:manage",
        "users:manage",
        "billing:manage",
        "crm:read",
        "crm:write",
        "quotes:read",
        "quotes:write",
        "invoices:read",
        "invoices:write",
        "projects:read",
        "projects:write",
        "documents:read",
        "documents:write",
        "ai:use",
        "automations:manage",
        "analytics:read",
        "settings:manage",
        "modules:manage",
      ],
      wf(
        "timeclock:manage",
        "payroll:manage",
        "accounting:manage",
        "chat:moderate",
        "location:view",
        "meetings:host",
        "posts:write",
        "live:host"
      )
    ),
  },
  COMPANY_ADMIN: {
    labelFr: "Administrateur central",
    descriptionFr: "Direction de l'entreprise — utilisateurs, facturation, modules.",
    category: "direction",
    ...base(
      [
        "company:manage",
        "users:manage",
        "billing:manage",
        "crm:read",
        "crm:write",
        "quotes:read",
        "quotes:write",
        "invoices:read",
        "invoices:write",
        "projects:read",
        "projects:write",
        "documents:read",
        "documents:write",
        "ai:use",
        "automations:manage",
        "analytics:read",
        "settings:manage",
        "modules:manage",
      ],
      wf(
        "timeclock:manage",
        "payroll:manage",
        "accounting:manage",
        "chat:moderate",
        "location:view",
        "meetings:host",
        "posts:write",
        "live:host"
      )
    ),
  },
  PROJECT_MANAGER: {
    labelFr: "Chef de projet",
    descriptionFr: "Gestion des chantiers, clients, soumissions et équipes terrain.",
    category: "chantier",
    ...base(
      [
        "crm:read",
        "crm:write",
        "quotes:read",
        "quotes:write",
        "invoices:read",
        "projects:read",
        "projects:write",
        "documents:read",
        "documents:write",
        "ai:use",
        "analytics:read",
      ],
      wf(
        "timeclock:manage",
        "payroll:read",
        "chat:moderate",
        "location:view",
        "meetings:host",
        "posts:write",
        "live:host"
      )
    ),
  },
  SITE_SUPERVISOR: {
    labelFr: "Contremaître",
    descriptionFr: "Supervision chantier, pointages, géolocalisation et sécurité terrain.",
    category: "chantier",
    ...base(
      ["projects:read", "projects:write", "documents:read", "documents:write"],
      wf(
        "timeclock:manage",
        "chat:moderate",
        "location:view",
        "meetings:host",
        "posts:write"
      )
    ),
  },
  FOREMAN: {
    labelFr: "Chef d'équipe",
    descriptionFr: "Coordination ouvriers sur chantier, pointage et communication équipe.",
    category: "chantier",
    ...base(["projects:read", "documents:read"], wf("timeclock:manage", "location:view"))
  },
  FIELD_WORKER: {
    labelFr: "Ouvrier de chantier",
    descriptionFr: "Pointage chronomètre, chat sécurisé, documents chantier.",
    category: "chantier",
    ...base(["projects:read", "documents:read"], wf("payroll:read"))
  },
  ESTIMATOR: {
    labelFr: "Estimateur",
    descriptionFr: "Soumissions, devis, lecture CRM et projets.",
    category: "bureau",
    ...base(
      ["crm:read", "quotes:read", "quotes:write", "projects:read", "documents:read", "ai:use"],
      wf()
    ),
  },
  ACCOUNTANT: {
    labelFr: "Comptable",
    descriptionFr: "Factures, paiements, paie, comptabilité et taxes.",
    category: "bureau",
    ...base(
      [
        "crm:read",
        "quotes:read",
        "invoices:read",
        "invoices:write",
        "billing:manage",
        "analytics:read",
      ],
      wf("payroll:read", "payroll:manage", "accounting:read", "accounting:manage")
    ),
  },
  PAYROLL_CLERK: {
    labelFr: "Responsable paie",
    descriptionFr: "Heures chantier, fiches de paie, T4 et masse salariale.",
    category: "bureau",
    ...base(["documents:read"], wf("timeclock:manage", "payroll:read", "payroll:manage", "accounting:read"))
  },
  SAFETY_OFFICER: {
    labelFr: "Agent sécurité",
    descriptionFr: "Conformité CNESST, inspections chantier et alertes.",
    category: "support",
    ...base(
      ["projects:read", "documents:read", "documents:write", "settings:manage"],
      wf("location:view")
    ),
  },
  HR_MANAGER: {
    labelFr: "Responsable RH",
    descriptionFr: "Recrutement, invitations, paie et dossiers employés.",
    category: "support",
    ...base(["users:manage", "documents:read"], wf("timeclock:manage", "payroll:read", "payroll:manage", "chat:moderate"))
  },
  PROCUREMENT: {
    labelFr: "Approvisionnement",
    descriptionFr: "Achats matériaux, fournisseurs et suivi projets.",
    category: "bureau",
    ...base(["crm:read", "quotes:read", "projects:read", "documents:read", "documents:write"], wf())
  },
  OFFICE_ADMIN: {
    labelFr: "Administration bureau",
    descriptionFr: "Courriels clients, CRM, soumissions et factures (lecture).",
    category: "bureau",
    ...base(
      ["crm:read", "crm:write", "quotes:read", "invoices:read", "projects:read", "documents:read"],
      wf("posts:write", "meetings:host")
    ),
  },
  MANAGER: {
    labelFr: "Gestionnaire",
    descriptionFr: "Gestion opérationnelle — CRM, projets, soumissions et factures.",
    category: "direction",
    ...base(
      [
        "crm:read",
        "crm:write",
        "quotes:read",
        "quotes:write",
        "invoices:read",
        "invoices:write",
        "projects:read",
        "projects:write",
        "documents:read",
        "documents:write",
        "ai:use",
        "analytics:read",
      ],
      wf(
        "timeclock:manage",
        "payroll:read",
        "accounting:read",
        "chat:moderate",
        "location:view",
        "meetings:host",
        "posts:write",
        "live:host"
      )
    ),
  },
  EMPLOYEE: {
    labelFr: "Employé",
    descriptionFr: "Accès standard — projets, documents, chronomètre et chat.",
    category: "chantier",
    ...base(
      ["crm:read", "quotes:read", "invoices:read", "projects:read", "projects:write", "documents:read", "ai:use"],
      wf("payroll:read")
    ),
  },
};

export const ALL_ROLES = Object.keys(ROLE_DEFINITIONS) as import("@/types").Role[];

export const INVITABLE_ROLES = ALL_ROLES.filter(
  (r) => r !== "SUPER_ADMIN"
) as import("@/types").Role[];

export function roleLabelFr(role: import("@/types").Role): string {
  return ROLE_DEFINITIONS[role]?.labelFr ?? role.replaceAll("_", " ");
}

export function roleDescriptionFr(role: import("@/types").Role): string {
  return ROLE_DEFINITIONS[role]?.descriptionFr ?? "";
}

export function buildBasePermissions(role: import("@/types").Role): Permission[] {
  return ROLE_DEFINITIONS[role]?.permissions ?? [];
}

export function buildExtendedPermissions(role: import("@/types").Role): AppPermission[] {
  const def = ROLE_DEFINITIONS[role];
  if (!def) return [...UNIVERSAL_EMPLOYEE_PERMISSIONS];
  const merged = new Set<AppPermission>([
    ...def.permissions,
    ...def.workforce,
    ...UNIVERSAL_EMPLOYEE_PERMISSIONS,
  ]);
  return [...merged];
}

/** Permissions affichées dans l'onglet Rôles (paramètres). */
export function permissionsForRoleDisplay(role: import("@/types").Role): string[] {
  return buildExtendedPermissions(role).map((p) => p.replaceAll(":", " · "));
}
