import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import {
  clockIn,
  clockOut,
  getOpenEntry,
  listJobSites,
  listTimeEntries,
  payrollSummary,
} from "@/lib/timeclock/timeclock-service";
import { isWithinGeofence } from "@/lib/workforce/payroll";
import { canApp } from "@/lib/workforce/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  const url = new URL(request.url);
  const view = url.searchParams.get("view");

  if (view === "payroll" && canApp(enriched.role, "payroll:read")) {
    const summary = await payrollSummary(enriched.companyId);
    return NextResponse.json(summary);
  }

  const sites = await listJobSites(enriched.companyId);
  const employee = await resolveEmployeeId(enriched.companyId, enriched.email);
  const open = employee ? await getOpenEntry(enriched.companyId, employee) : null;
  const allEntries = canApp(enriched.role, "timeclock:manage")
    ? await listTimeEntries(enriched.companyId)
    : employee
      ? await listTimeEntries(enriched.companyId, employee)
      : [];

  return NextResponse.json({ sites, openEntry: open, entries: allEntries, employeeId: employee });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "clock_in") {
    const jobSiteId = typeof body.jobSiteId === "string" ? body.jobSiteId : "";
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const sites = await listJobSites(enriched.companyId);
    const site = sites.find((s) => s.id === jobSiteId);
    if (!site) {
      return NextResponse.json({ error: "Chantier introuvable." }, { status: 400 });
    }
    const fence = isWithinGeofence(
      { lat, lng },
      { lat: site.lat, lng: site.lng, radiusM: site.radiusM }
    );
    const result = await clockIn({
      companyId: enriched.companyId,
      email: enriched.email,
      role: enriched.role,
      jobSiteId,
      lat,
      lng,
      withinGeofence: fence.within,
      distanceFromSiteM: fence.distanceM,
      notes: fence.within ? undefined : `Hors zone (${fence.distanceM}m)`,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "clock_out") {
    const employeeId =
      typeof body.employeeId === "string"
        ? body.employeeId
        : await resolveEmployeeId(enriched.companyId, enriched.email);
    if (!employeeId) {
      return NextResponse.json({ error: "Employé introuvable." }, { status: 400 });
    }
    const result = await clockOut({
      companyId: enriched.companyId,
      employeeId,
      lat: Number(body.lat) || 0,
      lng: Number(body.lng) || 0,
      breakMinutes: Number(body.breakMinutes) || 30,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Action invalide." }, { status: 400 });
}

async function resolveEmployeeId(companyId: string, email: string) {
  const { prisma } = await import("@/lib/db");
  const emp = await prisma.employeeProfile.findFirst({ where: { companyId, email } });
  return emp?.id ?? null;
}
