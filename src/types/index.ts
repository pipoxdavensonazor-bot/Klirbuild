export type Role =
  | "SUPER_ADMIN"
  | "COMPANY_ADMIN"
  | "PROJECT_MANAGER"
  | "SITE_SUPERVISOR"
  | "FOREMAN"
  | "FIELD_WORKER"
  | "ESTIMATOR"
  | "ACCOUNTANT"
  | "PAYROLL_CLERK"
  | "SAFETY_OFFICER"
  | "HR_MANAGER"
  | "PROCUREMENT"
  | "OFFICE_ADMIN"
  | "MANAGER"
  | "EMPLOYEE";

export type Permission =
  | "company:manage"
  | "users:manage"
  | "billing:manage"
  | "crm:read"
  | "crm:write"
  | "quotes:read"
  | "quotes:write"
  | "invoices:read"
  | "invoices:write"
  | "projects:read"
  | "projects:write"
  | "documents:read"
  | "documents:write"
  | "ai:use"
  | "automations:manage"
  | "analytics:read"
  | "settings:manage"
  | "modules:manage";

import { buildBasePermissions } from "@/lib/workforce/roles";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: buildBasePermissions("SUPER_ADMIN"),
  COMPANY_ADMIN: buildBasePermissions("COMPANY_ADMIN"),
  PROJECT_MANAGER: buildBasePermissions("PROJECT_MANAGER"),
  SITE_SUPERVISOR: buildBasePermissions("SITE_SUPERVISOR"),
  FOREMAN: buildBasePermissions("FOREMAN"),
  FIELD_WORKER: buildBasePermissions("FIELD_WORKER"),
  ESTIMATOR: buildBasePermissions("ESTIMATOR"),
  ACCOUNTANT: buildBasePermissions("ACCOUNTANT"),
  PAYROLL_CLERK: buildBasePermissions("PAYROLL_CLERK"),
  SAFETY_OFFICER: buildBasePermissions("SAFETY_OFFICER"),
  HR_MANAGER: buildBasePermissions("HR_MANAGER"),
  PROCUREMENT: buildBasePermissions("PROCUREMENT"),
  OFFICE_ADMIN: buildBasePermissions("OFFICE_ADMIN"),
  MANAGER: buildBasePermissions("MANAGER"),
  EMPLOYEE: buildBasePermissions("EMPLOYEE"),
};

export function can(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export type ClientStatus = "lead" | "active" | "inactive" | "churned";
export type QuoteStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "expired"
  | "converted";
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled";
export type ProjectStatus = "planned" | "active" | "on_hold" | "completed";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type DealStage =
  | "new"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  plan: "starter" | "growth" | "business" | "enterprise";
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled";
  enabledModules: string[];
  brandingPrimary: string;
  brandingAccent: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  avatarInitials: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  tags: string[];
  city: string;
  industry: string;
  owner: string;
  createdAt: string;
  lifetimeValue: number;
}

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  email: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "unqualified";
  score: number;
  owner: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  companyId: string;
  title: string;
  clientName: string;
  value: number;
  stage: DealStage;
  owner: string;
  closeDate: string;
}

export interface Quote {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  status: QuoteStatus;
  total: number;
  currency: string;
  issueDate: string;
  validUntil: string;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
}

export interface Payment {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed";
  method: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId?: string;
  clientName: string;
  status: ProjectStatus;
  progress: number;
  members: string[];
  dueDate: string;
  budget: number;
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  assignee: string;
  dueDate: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  folder: string;
  type: "pdf" | "image" | "doc" | "sheet";
  size: string;
  updatedAt: string;
  tags: string[];
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  runs: number;
  lastRun?: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
}
