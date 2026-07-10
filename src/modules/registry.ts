export type ModuleNavItem = {
  href: string;
  label: string;
};

export type KlirlineModule = {
  id: string;
  name: string;
  description: string;
  nav: ModuleNavItem[];
  permissions: string[];
  enabledByDefault?: boolean;
};

export const moduleRegistry: KlirlineModule[] = [
  {
    id: "cleaning-os",
    name: "Cleaning OS",
    description: "Routes, checklists, and crew scheduling for cleaning businesses.",
    nav: [{ href: "/modules/cleaning-os", label: "Cleaning OS" }],
    permissions: ["projects:read"],
    enabledByDefault: false,
  },
  {
    id: "construction-os",
    name: "Construction OS",
    description:
      "ERP + CRM + IA + CCQ + Paiements + Marketing pour PME de construction au Canada.",
    nav: [{ href: "/construction", label: "Construction OS" }],
    permissions: ["projects:read"],
    enabledByDefault: true,
  },
  {
    id: "restaurant-os",
    name: "Restaurant OS",
    description: "Menus, shifts, vendors, and daily ops for restaurants.",
    nav: [{ href: "/modules/restaurant-os", label: "Restaurant OS" }],
    permissions: ["projects:read"],
  },
  {
    id: "medical-os",
    name: "Medical OS",
    description: "Clinics, appointments, and patient-adjacent workflows.",
    nav: [{ href: "/modules/medical-os", label: "Medical OS" }],
    permissions: ["crm:read"],
  },
  {
    id: "retail-os",
    name: "Retail OS",
    description: "Inventory, locations, and retail operations.",
    nav: [{ href: "/modules/retail-os", label: "Retail OS" }],
    permissions: ["crm:read"],
  },
  {
    id: "education-os",
    name: "Education OS",
    description: "Programs, cohorts, and education operations.",
    nav: [{ href: "/modules/education-os", label: "Education OS" }],
    permissions: ["crm:read"],
  },
  {
    id: "legal-os",
    name: "Legal OS",
    description: "Matters, retainers, and legal practice workflows.",
    nav: [{ href: "/modules/legal-os", label: "Legal OS" }],
    permissions: ["documents:read"],
  },
  {
    id: "manufacturing-os",
    name: "Manufacturing OS",
    description: "Work orders, BOM, and shop-floor tracking.",
    nav: [{ href: "/modules/manufacturing-os", label: "Manufacturing OS" }],
    permissions: ["projects:read"],
  },
];

export function getEnabledModuleNav(enabledModules: string[]): ModuleNavItem[] {
  return moduleRegistry
    .filter((m) => enabledModules.includes(m.id))
    .flatMap((m) => m.nav);
}

export function getModule(id: string) {
  return moduleRegistry.find((m) => m.id === id);
}
