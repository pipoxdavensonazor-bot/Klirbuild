import type { ChatTurn, OpenAiChatResult } from "@/lib/ai/types";

export type AiProviderId = "openai" | "openrouter" | "gemini" | "mock";

type ProviderAttempt = {
  id: Exclude<AiProviderId, "mock">;
  ready: boolean;
  run: () => Promise<OpenAiChatResult>;
};

async function chatOpenAiCompatible(options: {
  endpoint: string;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  extraHeaders?: Record<string, string>;
}): Promise<OpenAiChatResult> {
  const res = await fetch(options.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      ...(options.extraHeaders ?? {}),
    },
    body: JSON.stringify({
      model: options.model,
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
    throw new Error(`${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty chat completion");
  return { content, model: data.model ?? options.model };
}

async function chatGemini(options: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
}): Promise<OpenAiChatResult> {
  const model = options.model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(options.apiKey)}`;

  const contents = options.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!content) throw new Error("Gemini returned an empty response");
  return { content, model };
}

/** True if at least one live LLM provider key is configured. */
export function hasLiveAiProvider() {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  );
}

export function aiProviderStatusDetail() {
  const providers: string[] = [];
  if (process.env.OPENAI_API_KEY?.trim()) providers.push("openai");
  if (process.env.OPENROUTER_API_KEY?.trim()) providers.push("openrouter");
  if (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  ) {
    providers.push("gemini");
  }
  if (!providers.length) {
    return "Aucune clé IA — réponses locales limitées (OpenAI / OpenRouter / Gemini)";
  }
  return `providers: ${providers.join(" → ")}`;
}

/**
 * Prefer paid OpenAI if set, then free-friendly OpenRouter, then Gemini free tier.
 */
export async function chatWithFallback(options: {
  system: string;
  messages: ChatTurn[];
}): Promise<OpenAiChatResult & { provider: AiProviderId }> {
  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  const chain: ProviderAttempt[] = [
    {
      id: "openai",
      ready: Boolean(process.env.OPENAI_API_KEY?.trim()),
      run: () =>
        chatOpenAiCompatible({
          endpoint: "https://api.openai.com/v1/chat/completions",
          apiKey: process.env.OPENAI_API_KEY!.trim(),
          model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
          system: options.system,
          messages: options.messages,
        }),
    },
    {
      id: "openrouter",
      ready: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
      run: () =>
        chatOpenAiCompatible({
          endpoint: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: process.env.OPENROUTER_API_KEY!.trim(),
          model:
            process.env.OPENROUTER_MODEL?.trim() ||
            "openrouter/free",
          system: options.system,
          messages: options.messages,
          extraHeaders: {
            "HTTP-Referer":
              process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://klirline.app",
            "X-Title": "KlirBuild",
          },
        }),
    },
    {
      id: "gemini",
      ready: Boolean(geminiKey),
      run: () =>
        chatGemini({
          apiKey: geminiKey!,
          model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
          system: options.system,
          messages: options.messages,
        }),
    },
  ];

  const errors: string[] = [];
  for (const attempt of chain) {
    if (!attempt.ready) continue;
    try {
      const result = await attempt.run();
      return { ...result, provider: attempt.id };
    } catch (err) {
      errors.push(
        `${attempt.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw new Error(
    errors.length
      ? `Tous les providers IA ont échoué — ${errors.join(" | ")}`
      : "Aucun provider IA configuré"
  );
}
