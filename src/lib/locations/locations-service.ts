import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";

export type LiveLocationDto = {
  employeeId: string;
  employeeName: string;
  jobSiteId: string;
  jobSiteName: string;
  lat: number;
  lng: number;
  status: string;
  updatedAt: string;
};

export type JobSiteDto = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusM: number;
};

export async function getLocationsOverview(companyId: string) {
  if (!hasDatabase()) {
    return { sites: [] as JobSiteDto[], liveLocations: [] as LiveLocationDto[], activeCount: 0 };
  }

  const sites = await prisma.jobSite.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  const openEntries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      clockOutAt: null,
      status: { in: ["clocked_in", "pending_review", "on_break"] },
    },
    include: {
      employee: { select: { name: true } },
      jobSite: { select: { id: true, name: true, lat: true, lng: true } },
    },
    orderBy: { clockInAt: "desc" },
  });

  const liveLocations: LiveLocationDto[] = openEntries.map((e) => ({
    employeeId: e.employeeId,
    employeeName: e.employee.name,
    jobSiteId: e.jobSiteId ?? "",
    jobSiteName: e.jobSite?.name ?? "—",
    lat: e.clockInLat ?? e.jobSite?.lat ?? 0,
    lng: e.clockInLng ?? e.jobSite?.lng ?? 0,
    status: e.status,
    updatedAt: e.clockInAt.toISOString(),
  }));

  return {
    sites: sites.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      radiusM: s.radiusM,
    })),
    liveLocations,
    activeCount: openEntries.length,
  };
}
