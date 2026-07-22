export type ChatTurn = { role: "user" | "assistant"; content: string };

export type OpenAiChatResult = {
  content: string;
  model: string;
};
