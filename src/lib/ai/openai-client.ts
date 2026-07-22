/**
 * Back-compat OpenAI helper — prefer `chatWithFallback` from chat-provider.ts.
 */
import { chatWithFallback } from "@/lib/ai/chat-provider";
import type { ChatTurn, OpenAiChatResult } from "@/lib/ai/types";

export type { ChatTurn, OpenAiChatResult };

export async function openAiChat(options: {
  system: string;
  messages: ChatTurn[];
  model?: string;
}): Promise<OpenAiChatResult> {
  // `model` kept for signature compatibility; provider chain picks env models.
  void options.model;
  const result = await chatWithFallback({
    system: options.system,
    messages: options.messages,
  });
  return { content: result.content, model: result.model };
}
