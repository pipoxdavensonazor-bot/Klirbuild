import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

export type AiChatMessageDto = {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string;
  toolName?: string;
};

async function resolveUserId(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function getAiChatThread(companyId: string, email: string) {
  if (!hasDatabase()) return { messages: [] as AiChatMessageDto[] };

  const userId = await resolveUserId(email);
  const thread = await prisma.chatThread.findFirst({
    where: { companyId, ...(userId ? { userId } : {}) },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 50 },
    },
  });

  if (!thread) return { messages: [] as AiChatMessageDto[] };

  return {
    threadId: thread.id,
    messages: thread.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      at: m.createdAt.toISOString(),
      toolName: m.toolName ?? undefined,
    })),
  };
}

export async function appendAiChatMessages(input: {
  companyId: string;
  email: string;
  userContent: string;
  assistantContent: string;
  toolName?: string;
}) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const userId = await resolveUserId(input.email);
  let thread = await prisma.chatThread.findFirst({
    where: { companyId: input.companyId, ...(userId ? { userId } : {}) },
    orderBy: { updatedAt: "desc" },
  });

  if (!thread) {
    thread = await prisma.chatThread.create({
      data: {
        companyId: input.companyId,
        userId,
        title: input.userContent.slice(0, 80),
      },
    });
  }

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: "user",
        content: input.userContent,
      },
    }),
    prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: "assistant",
        content: input.assistantContent,
        toolName: input.toolName ?? null,
      },
    }),
    prisma.chatThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  return { threadId: thread.id };
}
