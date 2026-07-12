export type ChatTurn = { role: "user" | "assistant"; content: string };

export type OpenAiChatResult = {
  content: string;
  model: string;
};

export async function openAiChat(options: {
  system: string;
  messages: ChatTurn[];
  model?: string;
}): Promise<OpenAiChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        { role: "system", content: options.system },
        ...options.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned an empty response");

  return { content, model: data.model ?? model };
}
