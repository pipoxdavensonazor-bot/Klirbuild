import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

const COMPANY_CHANNEL_NAME = "Équipe — Général";

export type ChatMessageDto = {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  body: string;
  at: string;
  encrypted: boolean;
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
}): ChatMessageDto {
  return {
    id: row.id,
    channelId: row.channelId,
    senderId: row.senderId ?? "unknown",
    senderName: row.senderName,
    body: row.body,
    at: row.createdAt.toISOString(),
    encrypted: row.encrypted,
  };
}

const emptyChat = (email: string, senderName: string) => ({
  channelId: "",
  channelName: COMPANY_CHANNEL_NAME,
  channels: [] as { id: string; name: string; type: "company" | "site"; encrypted: boolean }[],
  messages: [] as ChatMessageDto[],
  me: { email, name: senderName },
});

export async function listTeamChat(companyId: string, email: string, senderName: string) {
  if (!hasDatabase()) return emptyChat(email, senderName);

  const channel = await ensureCompanyChannel(companyId);
  const rows = await prisma.teamChatMessage.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const siteChannels = await prisma.teamChannel.findMany({
    where: { companyId, type: "site" },
    orderBy: { name: "asc" },
  });
  return {
    channelId: channel.id,
    channelName: channel.name,
    channels: [
      { id: channel.id, name: channel.name, type: "company" as const, encrypted: true },
      ...siteChannels.map((c) => ({
        id: c.id,
        name: c.name,
        type: "site" as const,
        encrypted: c.encrypted,
      })),
    ],
    messages: rows.map(mapRow),
    me: { email, name: senderName },
  };
}

export async function sendTeamChatMessage(input: {
  companyId: string;
  email: string;
  senderName: string;
  body: string;
  channelId?: string;
}) {
  const body = input.body.trim();
  if (!body) return { error: "Message vide." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const channel = input.channelId
    ? await prisma.teamChannel.findFirst({
        where: { id: input.channelId, companyId: input.companyId },
      })
    : await ensureCompanyChannel(input.companyId);
  if (!channel) return { error: "Canal introuvable." as const };

  const row = await prisma.teamChatMessage.create({
    data: {
      channelId: channel.id,
      senderId: input.email,
      senderName: input.senderName,
      body,
      encrypted: true,
    },
  });
  return { message: mapRow(row) };
}

export async function listChannelMessages(companyId: string, channelId: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const channel = await prisma.teamChannel.findFirst({
    where: { id: channelId, companyId },
  });
  if (!channel) return { error: "Canal introuvable." as const };
  const rows = await prisma.teamChatMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
    take: 300,
  });
  return { messages: rows.map(mapRow), channel };
}
