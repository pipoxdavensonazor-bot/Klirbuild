import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { appendAiChatMessages, getAiChatThread } from "@/lib/ai/ai-chat-service";
import { buildBusinessContext, buildConstructionContext } from "@/lib/ai/context";
import {
  chatWithFallback,
  hasLiveAiProvider,
} from "@/lib/ai/chat-provider";
import { mockKeywordReply } from "@/lib/ai/mock-replies";
import type { ChatTurn } from "@/lib/ai/openai-client";
import { constructionSystemPrompt, generalSystemPrompt } from "@/lib/ai/prompts";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";
import { getMarket, type MarketRegionId } from "@/lib/markets/regions";

export const runtime = "nodejs";

const MAX_HISTORY = 12;

function parseHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatTurn =>
        Boolean(m) &&
        typeof m === "object" &&
        (m as ChatTurn).role &&
        ((m as ChatTurn).role === "user" || (m as ChatTurn).role === "assistant") &&
        typeof (m as ChatTurn).content === "string"
    )
    .slice(-MAX_HISTORY);
}

export async function GET() {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const thread = await getAiChatThread(auth.companyId, auth.session.email);
  return NextResponse.json(thread);
}

export async function POST(request: Request) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  const regionId = (body.marketRegion as MarketRegionId) || "CA-QC";
  const mode = body.mode === "construction" ? "construction" : "general";
  const history = parseHistory(body.history);

  if (!message) {
    return NextResponse.json({ error: "Message requis." }, { status: 400 });
  }

  const market = getMarket(regionId);
  const { companyId } = auth;
  const email = auth.session.email;
  const denied = await requireCompanyPlanFeature(companyId, "ai");
  if (denied) return denied;
  const hasLiveAi = hasLiveAiProvider();

  let reply: string;
  let tool: string;
  let provider: string;
  let model: string | undefined;
  let hint: string | undefined;
  let errorNote: string | undefined;

  if (hasLiveAi) {
    try {
      const context =
        mode === "construction"
          ? await buildConstructionContext(companyId, market)
          : await buildBusinessContext(companyId, market);

      const system =
        mode === "construction"
          ? constructionSystemPrompt(market, context)
          : generalSystemPrompt(market, context);

      const messages: ChatTurn[] = [...history, { role: "user", content: message }];
      const result = await chatWithFallback({ system, messages });

      reply = result.content;
      tool = mode === "construction" ? "constructionCopilot" : "klirAiCopilot";
      provider = result.provider;
      model = result.model;
    } catch (err) {
      console.error("[ai/chat] provider error:", err);
      const fallback = mockKeywordReply(message, regionId);
      reply = fallback.reply;
      tool = fallback.tool;
      provider = "mock";
      errorNote =
        err instanceof Error
          ? "IA cloud indisponible — réponse locale de secours."
          : "IA cloud indisponible.";
    }
  } else {
    const mock = mockKeywordReply(message, regionId);
    reply = mock.reply;
    tool = mock.tool;
    provider = "mock";
    hint =
      "Ajoutez OPENROUTER_API_KEY (gratuit) ou GEMINI_API_KEY / OPENAI_API_KEY pour activer Klir AI.";
  }

  await appendAiChatMessages({
    companyId,
    email,
    userContent: message,
    assistantContent: reply,
    toolName: tool,
  });

  return NextResponse.json({
    reply,
    tool,
    market: market.id,
    provider,
    model,
    hint,
    error: errorNote,
  });
}
