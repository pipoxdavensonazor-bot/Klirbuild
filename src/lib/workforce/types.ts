import type { Permission, Role } from "@/types";
import { ROLE_PERMISSIONS, can as canRole } from "@/types";

export type {
  Permission,
  Role,
};

export type NavItem = {
  href: string;
  label: string;
  permission?: Permission | Permission[];
  /** If set, only these roles see the item (in addition to permission) */
  roles?: Role[];
};

/** Extended permissions for workforce / accounting / chat */
export const WORKFORCE_PERMISSIONS = [
  "timeclock:use",
  "timeclock:manage",
  "payroll:read",
  "payroll:manage",
  "accounting:read",
  "accounting:manage",
  "chat:use",
  "chat:moderate",
  "location:view",
] as const;

export type WorkforcePermission = (typeof WORKFORCE_PERMISSIONS)[number];

export type AppPermission = Permission | WorkforcePermission;

export const EXTENDED_ROLE_PERMISSIONS: Record<Role, AppPermission[]> = {
  SUPER_ADMIN: [
    ...ROLE_PERMISSIONS.SUPER_ADMIN,
    ...WORKFORCE_PERMISSIONS,
  ],
  COMPANY_ADMIN: [
    ...ROLE_PERMISSIONS.COMPANY_ADMIN,
    ...WORKFORCE_PERMISSIONS,
  ],
  MANAGER: [
    ...ROLE_PERMISSIONS.MANAGER,
    "timeclock:use",
    "timeclock:manage",
    "payroll:read",
    "accounting:read",
    "chat:use",
    "chat:moderate",
    "location:view",
    "crm:write", // social ads + construction CRM
  ],
  EMPLOYEE: [
    "projects:read",
    "documents:read",
    "timeclock:use",
    "chat:use",
    "payroll:read", // own payslips / T4 only (enforced in UI)
  ],
};

export function canApp(role: Role, permission: AppPermission) {
  return EXTENDED_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAny(role: Role, permissions: AppPermission[]) {
  return permissions.some((p) => canApp(role, p));
}

export { canRole };

export type GeoPoint = {
  lat: number;
  lng: number;
  accuracyM?: number;
  address?: string;
};

export type JobSite = {
  id: string;
  name: string;
  address: string;
  clientName: string;
  lat: number;
  lng: number;
  /** Geofence radius in meters */
  radiusM: number;
};

export type EmployeeProfile = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  hourlyRate: number;
  overtimeRate: number;
  status: "active" | "on_leave" | "terminated";
  phone: string;
  sinMasked: string;
  hireDate: string;
  avatarInitials: string;
};

export type TimeEntryStatus = "clocked_in" | "clocked_out" | "pending_review" | "approved";

export type TimeEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  jobSiteId: string;
  jobSiteName: string;
  clockInAt: string;
  clockOutAt?: string;
  clockInGeo: GeoPoint;
  clockOutGeo?: GeoPoint;
  withinGeofence: boolean;
  distanceFromSiteM: number;
  breakMinutes: number;
  hoursWorked?: number;
  status: TimeEntryStatus;
  notes?: string;
};

export type LiveLocation = {
  employeeId: string;
  employeeName: string;
  jobSiteId: string;
  jobSiteName: string;
  lat: number;
  lng: number;
  updatedAt: string;
  status: "on_site" | "off_site" | "traveling";
};

export type PayslipLine = {
  code: string;
  label: string;
  amount: number;
  type: "earning" | "deduction" | "employer";
};

export type Payslip = {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  netPay: number;
  lines: PayslipLine[];
  status: "draft" | "approved" | "paid";
  generatedAt: string;
};

export type TaxRateConfig = {
  id: string;
  name: string;
  /** e.g. TPS, TVQ, GST */
  code: string;
  rate: number;
  region: "CA" | "QC" | "ON" | "federal";
  appliesTo: "sales" | "payroll" | "both";
};

export type LedgerAccount = {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  balance: number;
};

export type JournalEntry = {
  id: string;
  date: string;
  memo: string;
  reference: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  taxCode?: string;
  taxAmount?: number;
};

export type TeamChatChannel = {
  id: string;
  name: string;
  type: "site" | "company" | "direct";
  encrypted: boolean;
  memberIds: string[];
  unread: number;
};

export type TeamChatMessage = {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  body: string;
  at: string;
  /** Demo flag — real impl uses E2E / TLS + server encryption at rest */
  encrypted: boolean;
  attachments?: string[];
};
