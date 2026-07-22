import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import type { Role } from "@/types";

const COMPANY_CHANNEL_NAME = "Équipe — Général";

export type ChatAttachmentDto = {
  id?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string;
};

export type ChatMessageDto = {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  body: string;
  at: string;
  encrypted: boolean;
  attachments: ChatAttachmentDto[];
};

async function ensureCompanyChannel(companyId: string) {
  let channel = await prisma.teamChannel.findFirst({
    where: { companyId, type: "company" },
  });
  if (!channel) {
    channel = await prisma.teamChannel.create({
      data: {
        companyId,
        name: COMPANY_CHANNEL_NAME,
        type: "company",
        encrypted: true,
      },
    });
  }
  return channel;
}

function mapRow(row: {
  id: string;
  channelId: string;
  senderId: string | null;
  senderName: string;
  body: string;
  encrypted: boolean;
  createdAt: Date;
  attachments?: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    url: string;
  }[];
}): ChatMessageDto {
  return {
    id: row.id,
    channelId: row.channelId,
    senderId: row.senderId ?? "unknown",
    senderName: row.senderName,
    body: row.body,
    at: row.createdAt.toISOString(),
    encrypted: row.encrypted,
    attachments: row.attachments ?? [],
  };
}

const emptyChat = (email: string, senderName: string) => ({
  channelId: "",
  channelName: COMPANY_CHANNEL_NAME,
  channels: [] as ChannelDto[],
  messages: [] as ChatMessageDto[],
  me: { email, name: senderName },
  users: [] as ChatUserDto[],
});

export type ChannelDto = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  encrypted: boolean;
  allowedRoles: string[];
  members: { email: string; role?: Role | null }[];
};

export type ChatUserDto = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function userCanAccessChannel(
  channel: {
    type: string;
    createdById: string | null;
    allowedRoles: string[];
    members: { email: string; role: Role | null }[];
  },
  email: string,
  role: Role
) {
  if (channel.type === "company") return true;
  if (!channel.allowedRoles.length && !channel.members.length) return true;
  if (channel.createdById === email) return true;
  if (channel.allowedRoles.includes(role)) return true;
  return channel.members.some((m) => m.email.toLowerCase() === email.toLowerCase());
}

function mapChannel(channel: {
  id: string;
  name: string;
  description: string | null;
  type: string;
  encrypted: boolean;
  allowedRoles: string[];
  members: { email: string; role: Role | null }[];
}): ChannelDto {
  return {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    type: channel.type,
    encrypted: channel.encrypted,
    allowedRoles: channel.allowedRoles,
    members: channel.members.map((m) => ({ email: m.email, role: m.role })),
  };
}

/** Aperçu léger pour le widget dashboard (évite Error 1102 CPU Worker). */
export async function listTeamChatPreview(
  companyId: string,
  email: string,
  senderName: string,
  limit = 4
) {
  if (!hasDatabase()) return emptyChat(email, senderName);

  const channel = await ensureCompanyChannel(companyId);
  const rows = await prisma.teamChatMessage.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 20),
    select: {
      id: true,
      senderId: true,
      senderName: true,
      body: true,
      encrypted: true,
      createdAt: true,
    },
  });

  return {
    channelId: channel.id,
    channelName: channel.name,
    channels: [],
    messages: rows.reverse().map((row) => ({
      id: row.id,
      channelId: channel.id,
      senderId: row.senderId,
      senderName: row.senderName,
      body: row.body,
      encrypted: row.encrypted,
      at: row.createdAt.toISOString(),
      attachments: [] as ChatAttachmentDto[],
    })),
    me: { email, name: senderName },
    users: [],
  };
}

export async function listTeamChat(
  companyId: string,
  email: string,
  senderName: string,
  role: Role
) {
  if (!hasDatabase()) return emptyChat(email, senderName);

  const channel = await ensureCompanyChannel(companyId);
  const rows = await prisma.teamChatMessage.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { attachments: true },
  });
  const allChannels = await prisma.teamChannel.findMany({
    where: { companyId },
    include: { members: true },
    orderBy: { name: "asc" },
    take: 50,
  });
  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  const visibleChannels = allChannels
    .filter((c) => userCanAccessChannel(c, email, role))
    .sort((a, b) => (a.type === "company" ? -1 : b.type === "company" ? 1 : a.name.localeCompare(b.name)));

  return {
    channelId: channel.id,
    channelName: channel.name,
    channels: visibleChannels.map(mapChannel),
    messages: rows.reverse().map(mapRow),
    me: { email, name: senderName },
    users,
  };
}

export async function sendTeamChatMessage(input: {
  companyId: string;
  email: string;
  role: Role;
  senderName: string;
  body: string;
  channelId?: string;
  attachments?: ChatAttachmentDto[];
}) {
  const body = input.body.trim();
  const attachments = input.attachments ?? [];
  if (!body && !attachments.length) return { error: "Message ou fichier requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const channel = input.channelId
    ? await prisma.teamChannel.findFirst({
        where: { id: input.channelId, companyId: input.companyId },
        include: { members: true },
      })
    : await prisma.teamChannel.findFirst({
        where: { id: (await ensureCompanyChannel(input.companyId)).id },
        include: { members: true },
      });
  if (!channel) return { error: "Canal introuvable." as const };
  if (!userCanAccessChannel(channel, input.email, input.role)) {
    return { error: "Accès au canal refusé." as const };
  }

  const row = await prisma.teamChatMessage.create({
    data: {
      channelId: channel.id,
      senderId: input.email,
      senderName: input.senderName,
      body,
      encrypted: true,
      attachments: {
        create: attachments.map((a) => ({
          name: a.name,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          storageKey: a.storageKey,
          url: a.url,
        })),
      },
    },
    include: { attachments: true },
  });
  return { message: mapRow(row) };
}

export async function listChannelMessages(
  companyId: string,
  channelId: string,
  email: string,
  role: Role
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const channel = await prisma.teamChannel.findFirst({
    where: { id: channelId, companyId },
    include: { members: true },
  });
  if (!channel) return { error: "Canal introuvable." as const };
  if (!userCanAccessChannel(channel, email, role)) {
    return { error: "Accès au canal refusé." as const };
  }
  const rows = await prisma.teamChatMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { attachments: true },
  });
  return { messages: rows.reverse().map(mapRow), channel };
}

export async function createTeamChannel(input: {
  companyId: string;
  creatorEmail: string;
  name: string;
  description?: string;
  allowedRoles?: Role[];
  memberEmails?: string[];
}) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };
  const name = input.name.trim();
  if (!name) return { error: "Nom du groupe requis." as const };

  const users = await prisma.user.findMany({
    where: {
      companyId: input.companyId,
      email: { in: [...new Set([...(input.memberEmails ?? []), input.creatorEmail])] },
    },
    select: { id: true, email: true, role: true },
  });
  const members = users.map((u) => ({
    userId: u.id,
    email: u.email,
    role: u.role,
  }));

  const channel = await prisma.teamChannel.create({
    data: {
      companyId: input.companyId,
      name,
      description: input.description?.trim() || null,
      type: "group",
      encrypted: true,
      allowedRoles: input.allowedRoles ?? [],
      createdById: input.creatorEmail,
      members: { create: members },
    },
    include: { members: true },
  });

  await prisma.auditLog.create({
    data: {
      companyId: input.companyId,
      actorId: input.creatorEmail,
      action: "team_channel.created",
      meta: {
        channelId: channel.id,
        name,
        allowedRoles: input.allowedRoles ?? [],
        memberEmails: members.map((m) => m.email),
      },
    },
  });

  return { channel: mapChannel(channel) };
}
