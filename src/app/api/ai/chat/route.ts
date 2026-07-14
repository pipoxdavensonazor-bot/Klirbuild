import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { appendAiChatMessages, getAiChatThread } from "@/lib/ai/ai-chat-service";
import { buildBusinessContext, buildConstructionContext } from "@/lib/ai/context";
import { mockKeywordReply } from "@/lib/ai/mock-replies";
import { openAiChat, type ChatTurn } from "@/lib/ai/openai-client";
import { constructionSystemPrompt, generalSystemPrompt } from "@/lib/ai/prompts";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
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

async function resolveSession() {
  const session = await getRequestSession();
  if (!session) return { companyId: DEMO_COMPANY_ID, email: "guest@klirline.demo" };
  const enriched = await enrichSession(session);
  return { companyId: enriched.companyId, email: enriched.email };
}

export async function GET() {
  const { companyId, email } = await resolveSession();
  const thread = await getAiChatThread(companyId, email);
  return NextResponse.json(thread);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  const regionId = (body.marketRegion as MarketRegionId) || "CA-QC";
  const mode = body.mode === "construction" ? "construction" : "general";
  const history = parseHistory(body.history);

  if (!message) {
    return NextResponse.json({ error: "Message requis." }, { status: 400 });
  }

  const market = getMarket(regionId);
  const { companyId, email } = await resolveSession();
  const denied = await requireCompanyPlanFeature(companyId, "ai");
  if (denied) return denied;
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);

  let reply: string;
  let tool: string;
  let provider: string;
  let model: string | undefined;
  let hint: string | undefined;
  let errorNote: string | undefined;

  if (hasOpenAi) {
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
      const result = await openAiChat({ system, messages });

      reply = result.content;
      tool = mode === "construction" ? "constructionCopilot" : "klirAiCopilot";
      provider = "openai";
      model = result.model;
    } catch (err) {
      console.error("[ai/chat] OpenAI error:", err);
      const fallback = mockKeywordReply(message, regionId);
      reply = fallback.reply;
      tool = fallback.tool;
      provider = "mock";
      errorNote =
        err instanceof Error
          ? "OpenAI indisponible — réponse locale de secours."
          : "OpenAI indisponible.";
    }
  } else {
    const mock = mockKeywordReply(message, regionId);
    reply = mock.reply;
    tool = mock.tool;
    provider = "mock";
    hint = "Ajoutez OPENAI_API_KEY sur Vercel pour activer Klir AI en direct.";
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
