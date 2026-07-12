import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { hoursFromClock } from "@/lib/workforce/payroll";
import type { Role } from "@/types";

export type TimeEntryDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  jobSiteId: string;
  jobSiteName: string;
  clockInAt: string;
  clockOutAt?: string;
  hoursWorked?: number;
  withinGeofence: boolean;
  distanceFromSiteM: number;
  status: string;
  notes?: string;
  pauseStartedAt?: string;
  totalPauseMs?: number;
  onBreak?: boolean;
};

async function resolveEmployee(
  companyId: string,
  email: string,
  role: Role,
  name?: string
) {
  const existing = await prisma.employeeProfile.findFirst({
    where: { companyId, email },
  });
  if (existing) return existing;
  return prisma.employeeProfile.create({
    data: {
      companyId,
      email,
      name: name ?? email.split("@")[0],
      role,
      jobTitle: role === "EMPLOYEE" ? "Ouvrier chantier" : "Gestionnaire",
      hourlyRate: 35,
      overtimeRate: 52.5,
    },
  });
}

function mapRow(row: {
  id: string;
  employeeId: string;
  employee: { name: string };
  jobSiteId: string | null;
  jobSite: { name: string } | null;
  clockInAt: Date;
  clockOutAt: Date | null;
  hoursWorked: { toNumber(): number } | null;
  withinGeofence: boolean;
  distanceFromSiteM: number | null;
  status: string;
  notes: string | null;
  pauseStartedAt?: Date | null;
  totalPauseMs?: number | null;
}): TimeEntryDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employee.name,
    jobSiteId: row.jobSiteId ?? "",
    jobSiteName: row.jobSite?.name ?? "—",
    clockInAt: row.clockInAt.toISOString(),
    clockOutAt: row.clockOutAt?.toISOString(),
    hoursWorked: row.hoursWorked ? row.hoursWorked.toNumber() : undefined,
    withinGeofence: row.withinGeofence,
    distanceFromSiteM: row.distanceFromSiteM ?? 0,
    status: row.status,
    notes: row.notes ?? undefined,
    pauseStartedAt: row.pauseStartedAt?.toISOString(),
    totalPauseMs: row.totalPauseMs ?? 0,
    onBreak: row.status === "on_break",
  };
}

function accumulatedPauseMs(row: {
  pauseStartedAt?: Date | null;
  totalPauseMs?: number | null;
}) {
  let total = row.totalPauseMs ?? 0;
  if (row.pauseStartedAt) {
    total += Math.max(0, Date.now() - row.pauseStartedAt.getTime());
  }
  return total;
}

export async function listJobSites(companyId: string) {
  if (!hasDatabase()) return [];
  return prisma.jobSite.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function listTimeEntries(companyId: string, employeeId?: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.timeEntry.findMany({
    where: {
      companyId,
      ...(employeeId ? { employeeId } : {}),
    },
    include: {
      employee: { select: { name: true } },
      jobSite: { select: { name: true } },
    },
    orderBy: { clockInAt: "desc" },
    take: 100,
  });
  return rows.map(mapRow);
}

/** Shift actif = pas encore pointé en sortie (inclut pending_review hors géofence). */
const openEntryWhere = {
  clockOutAt: null,
  status: { in: ["clocked_in", "pending_review", "on_break"] as string[] },
} as const;

export async function getOpenEntry(companyId: string, employeeId: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.timeEntry.findFirst({
    where: { companyId, employeeId, ...openEntryWhere },
    include: {
      employee: { select: { name: true } },
      jobSite: { select: { name: true } },
    },
    orderBy: { clockInAt: "desc" },
  });
  return row ? mapRow(row) : null;
}

export async function clockIn(input: {
  companyId: string;
  email: string;
  role: Role;
  jobSiteId: string;
  lat: number;
  lng: number;
  withinGeofence: boolean;
  distanceFromSiteM: number;
  notes?: string;
}) {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis pour le pointage." as const };
  }

  const employee = await resolveEmployee(input.companyId, input.email, input.role);
  const open = await getOpenEntry(input.companyId, employee.id);
  if (open) return { error: "Pointage déjà en cours." as const };

  const site = await prisma.jobSite.findFirst({
    where: { id: input.jobSiteId, companyId: input.companyId },
  });
  if (!site) return { error: "Chantier introuvable." as const };

  const row = await prisma.timeEntry.create({
    data: {
      companyId: input.companyId,
      employeeId: employee.id,
      jobSiteId: site.id,
      clockInAt: new Date(),
      clockInLat: input.lat,
      clockInLng: input.lng,
      withinGeofence: input.withinGeofence,
      distanceFromSiteM: input.distanceFromSiteM,
      status: input.withinGeofence ? "clocked_in" : "pending_review",
      notes: input.notes,
    },
    include: {
      employee: { select: { name: true } },
      jobSite: { select: { name: true } },
    },
  });

  return { entry: mapRow(row) };
}

export async function clockOut(input: {
  companyId: string;
  employeeId: string;
  lat: number;
  lng: number;
  breakMinutes?: number;
}) {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis pour le pointage." as const };
  }

  const open = await prisma.timeEntry.findFirst({
    where: {
      companyId: input.companyId,
      employeeId: input.employeeId,
      ...openEntryWhere,
    },
    include: {
      employee: { select: { name: true, hourlyRate: true } },
      jobSite: { select: { name: true } },
    },
    orderBy: { clockInAt: "desc" },
  });
  if (!open) return { error: "Aucun pointage en cours." as const };

  const breakMinutes = input.breakMinutes ?? 30;
  const clockOutAt = new Date();
  const pauseMs = accumulatedPauseMs(open);
  const hours = hoursFromClock(
    open.clockInAt.toISOString(),
    clockOutAt.toISOString(),
    breakMinutes,
    pauseMs
  );

  const row = await prisma.timeEntry.update({
    where: { id: open.id },
    data: {
      clockOutAt,
      clockOutLat: input.lat,
      clockOutLng: input.lng,
      breakMinutes,
      totalPauseMs: pauseMs,
      pauseStartedAt: null,
      hoursWorked: hours,
      status: "approved",
    },
    include: {
      employee: { select: { name: true, hourlyRate: true } },
      jobSite: { select: { name: true } },
    },
  });

  const rate =
    typeof row.employee.hourlyRate === "number"
      ? row.employee.hourlyRate
      : row.employee.hourlyRate.toNumber();

  return {
    entry: mapRow(row),
    payroll: {
      hours,
      hourlyRate: rate,
      grossPay: Math.round(hours * rate * 100) / 100,
      pauseMinutes: Math.round(pauseMs / 60000),
    },
  };
}

export async function pauseShift(companyId: string, employeeId: string) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };

  const open = await prisma.timeEntry.findFirst({
    where: { companyId, employeeId, ...openEntryWhere },
    include: {
      employee: { select: { name: true } },
      jobSite: { select: { name: true } },
    },
    orderBy: { clockInAt: "desc" },
  });
  if (!open) return { error: "Aucun pointage en cours." as const };
  if (open.status === "on_break") return { error: "Pause déjà en cours." as const };

  const row = await prisma.timeEntry.update({
    where: { id: open.id },
    data: { status: "on_break", pauseStartedAt: new Date() },
    include: {
      employee: { select: { name: true } },
      jobSite: { select: { name: true } },
    },
  });
  return { entry: mapRow(row) };
}

export async function resumeShift(companyId: string, employeeId: string) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };

  const open = await prisma.timeEntry.findFirst({
    where: { companyId, employeeId, status: "on_break", clockOutAt: null },
    include: {
      employee: { select: { name: true } },
      jobSite: { select: { name: true } },
    },
    orderBy: { clockInAt: "desc" },
  });
  if (!open) return { error: "Aucune pause en cours." as const };

  const addedPause = open.pauseStartedAt
    ? Math.max(0, Date.now() - open.pauseStartedAt.getTime())
    : 0;

  const row = await prisma.timeEntry.update({
    where: { id: open.id },
    data: {
      status: open.withinGeofence ? "clocked_in" : "pending_review",
      pauseStartedAt: null,
      totalPauseMs: (open.totalPauseMs ?? 0) + addedPause,
    },
    include: {
      employee: { select: { name: true } },
      jobSite: { select: { name: true } },
    },
  });
  return { entry: mapRow(row) };
}

export async function payrollSummary(companyId: string) {
  if (!hasDatabase()) return { entries: [], totalHours: 0, totalGross: 0 };
  const rows = await prisma.timeEntry.findMany({
    where: { companyId, hoursWorked: { not: null } },
    include: { employee: { select: { name: true, hourlyRate: true } } },
    orderBy: { clockInAt: "desc" },
    take: 200,
  });
  let totalHours = 0;
  let totalGross = 0;
  const byEmployee: Record<
    string,
    { name: string; hours: number; gross: number; hourlyRate: number }
  > = {};

  for (const row of rows) {
    const hours = row.hoursWorked?.toNumber() ?? 0;
    const rate = row.employee.hourlyRate.toNumber();
    const gross = Math.round(hours * rate * 100) / 100;
    totalHours += hours;
    totalGross += gross;
    const key = row.employeeId;
    if (!byEmployee[key]) {
      byEmployee[key] = { name: row.employee.name, hours: 0, gross: 0, hourlyRate: rate };
    }
    byEmployee[key].hours += hours;
    byEmployee[key].gross += gross;
  }

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalGross: Math.round(totalGross * 100) / 100,
    employees: Object.values(byEmployee),
  };
}
