import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import type { Role } from "@/types";
import { canApp } from "@/lib/workforce/types";
import { createMeeting } from "@/lib/meetings/meetings-service";
import {
  createTeamChannel,
  sendTeamChatMessage,
} from "@/lib/chat/team-chat-service";

export type PresencePerson = {
  employeeId: string;
  employeeName: string;
  email: string;
  role: string;
  jobTitle?: string;
  jobSiteId: string;
  jobSiteName: string;
  status: string;
  clockInAt: string;
  lat: number;
  lng: number;
};

export function canViewPresenceBoard(role: Role) {
  return (
    canApp(role, "timeclock:manage") ||
    canApp(role, "location:view") ||
    role === "SUPER_ADMIN" ||
    role === "COMPANY_ADMIN"
  );
}

export async function listOfficePresence(companyId: string) {
  if (!hasDatabase()) return [] as PresencePerson[];

  const openEntries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      clockOutAt: null,
      status: { in: ["clocked_in", "pending_review", "on_break"] },
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          jobTitle: true,
        },
      },
      jobSite: { select: { id: true, name: true, lat: true, lng: true } },
    },
    orderBy: { clockInAt: "desc" },
  });

  const seen = new Set<string>();
  const people: PresencePerson[] = [];
  for (const e of openEntries) {
    if (seen.has(e.employeeId)) continue;
    seen.add(e.employeeId);
    people.push({
      employeeId: e.employee.id,
      employeeName: e.employee.name,
      email: e.employee.email,
      role: e.employee.role,
      jobTitle: e.employee.jobTitle ?? undefined,
      jobSiteId: e.jobSiteId ?? "",
      jobSiteName: e.jobSite?.name ?? "Bureau / site",
      status: e.status,
      clockInAt: e.clockInAt.toISOString(),
      lat: e.clockInLat ?? e.jobSite?.lat ?? 0,
      lng: e.clockInLng ?? e.jobSite?.lng ?? 0,
    });
  }
  return people;
}

async function ensureDirectChannel(input: {
  companyId: string;
  adminEmail: string;
  targetEmail: string;
  targetName: string;
}) {
  const channels = await prisma.teamChannel.findMany({
    where: { companyId: input.companyId, type: "direct" },
    include: { members: true },
  });
  const existing = channels.find((ch) => {
    const emails = new Set(ch.members.map((m) => m.email.toLowerCase()));
    return (
      emails.has(input.adminEmail.toLowerCase()) &&
      emails.has(input.targetEmail.toLowerCase()) &&
      emails.size === 2
    );
  });
  if (existing) return existing.id;

  const created = await createTeamChannel({
    companyId: input.companyId,
    creatorEmail: input.adminEmail,
    name: `Privé · ${input.targetName}`,
    description: "Canal privé admin ↔ employé",
    memberEmails: [input.targetEmail],
  });
  if ("error" in created && created.error) return null;

  await prisma.teamChannel.update({
    where: { id: created.channel!.id },
    data: { type: "direct" },
  });
  return created.channel!.id;
}

export async function sendPresenceMessage(input: {
  companyId: string;
  adminEmail: string;
  adminRole: Role;
  targetEmail: string;
  targetName: string;
  body: string;
}) {
  if (!canViewPresenceBoard(input.adminRole)) {
    return { error: "Accès tableau présence refusé." as const };
  }
  const body = input.body.trim();
  if (!body) return { error: "Message requis." as const };

  const channelId = await ensureDirectChannel({
    companyId: input.companyId,
    adminEmail: input.adminEmail,
    targetEmail: input.targetEmail,
    targetName: input.targetName,
  });
  if (!channelId) return { error: "Impossible de créer le canal privé." as const };

  const sent = await sendTeamChatMessage({
    companyId: input.companyId,
    channelId,
    email: input.adminEmail,
    senderName: input.adminEmail.split("@")[0],
    body,
    role: input.adminRole,
  });
  if ("error" in sent && sent.error) return { error: sent.error };
  return { ok: true as const, channelId, href: `/team-chat?channelId=${channelId}` };
}

export async function startPrivateVideoCall(input: {
  companyId: string;
  adminEmail: string;
  adminRole: Role;
  targetEmail: string;
  targetName: string;
}) {
  if (!canViewPresenceBoard(input.adminRole)) {
    return { error: "Accès tableau présence refusé." as const };
  }
  if (!canApp(input.adminRole, "meetings:host") && input.adminRole !== "COMPANY_ADMIN") {
    return { error: "Permission visio refusée." as const };
  }

  const meeting = await createMeeting({
    companyId: input.companyId,
    title: `Privé · ${input.targetName}`,
    audience: "company",
    hostUserId: input.adminEmail,
    hostName: input.adminEmail,
    allowedRoles: [],
  });
  if ("error" in meeting && meeting.error) return { error: meeting.error };

  const channelId = await ensureDirectChannel({
    companyId: input.companyId,
    adminEmail: input.adminEmail,
    targetEmail: input.targetEmail,
    targetName: input.targetName,
  });
  if (channelId) {
    await sendTeamChatMessage({
      companyId: input.companyId,
      channelId,
      email: input.adminEmail,
      senderName: input.adminEmail.split("@")[0],
      body: `Appel visio privé : rejoignez /meetings/${meeting.meeting!.id}`,
      role: input.adminRole,
    });
  }

  return {
    ok: true as const,
    meetingId: meeting.meeting!.id,
    href: `/meetings/${meeting.meeting!.id}`,
    channelId,
  };
}
