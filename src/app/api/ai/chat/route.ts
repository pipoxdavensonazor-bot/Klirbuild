import { NextResponse } from "next/server";
import { invoices, kpi } from "@/lib/mock-data";
import { recipesForRegion } from "@/lib/markets/automations";
import { calcMarketTaxes, getMarket, type MarketRegionId } from "@/lib/markets/regions";
import { weatherAlertsFor } from "@/lib/markets/weather";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ message: "", marketRegion: "CA-QC" }));
  const message = String(body.message ?? "").toLowerCase();
  const regionId = (body.marketRegion as MarketRegionId) || "CA-QC";
  const market = getMarket(regionId);

  let tool = "weeklyBusinessSummary";
  let reply = `KlirBuild · ${market.label} (${market.currency}). MTD revenue ${kpi.revenue.toLocaleString("en-CA", { style: "currency", currency: market.currency === "XCD" ? "USD" : market.currency })}, pipeline ${kpi.pipeline.toLocaleString("en-CA", { style: "currency", currency: market.currency === "XCD" ? "USD" : market.currency })}, ${kpi.tasksDue} open tasks. Tax stack: ${market.taxLines.map((t) => t.name).join(" + ")}.`;

  if (message.includes("overdue") || message.includes("invoice") || message.includes("facture")) {
    tool = "summarizeOverdueInvoices";
    const overdue = invoices.filter((i) => i.status === "overdue");
    reply = overdue.length
      ? `${overdue.length} overdue invoice(s) on ${market.label}: ${overdue
          .map((i) => `${i.number} (${i.clientName})`)
          .join("; ")}. Auto-Pilot can run dunning J+3/J+7/J+14.`
      : "No overdue invoices right now.";
  } else if (
    message.includes("tax") ||
    message.includes("tva") ||
    message.includes("vat") ||
    message.includes("tps") ||
    message.includes("sales tax")
  ) {
    tool = "calcMarketTaxes";
    const tax = calcMarketTaxes(10000, regionId);
    reply = `On a $10,000 subtotal in ${market.label}: ${tax.lines
      .map((l) => `${l.name}=${l.amount}`)
      .join(", ")} → total ${tax.total} ${market.currency}.`;
  } else if (
    message.includes("hurricane") ||
    message.includes("ouragan") ||
    message.includes("weather") ||
    message.includes("météo")
  ) {
    tool = "weatherRiskBrief";
    const alerts = weatherAlertsFor(regionId);
    reply = alerts.length
      ? alerts.map((a) => `${a.title} (${a.risk}): ${a.impact}`).join("\n")
      : `${market.label} has no hurricane pack — switch to FL or a Caribbean market.`;
  } else if (
    message.includes("auto") ||
    message.includes("automation") ||
    message.includes("pilot")
  ) {
    tool = "listAutoPilotRecipes";
    const recipes = recipesForRegion(regionId).filter((r) => r.advanced);
    reply = `Advanced Auto-Pilot recipes for ${market.label}:\n${recipes
      .slice(0, 6)
      .map((r) => `• ${r.name} — ${r.trigger}`)
      .join("\n")}`;
  } else if (message.includes("email") || message.includes("follow")) {
    tool = "draftClientEmail";
    reply =
      market.defaultLocale === "fr"
        ? "Brouillon:\n\nBonjour,\n\nJe fais un suivi sur les postes ouverts et les prochaines étapes du chantier. Disponible pour un appel rapide.\n\nCordialement,\nAlex"
        : market.defaultLocale === "es"
          ? "Borrador:\n\nHola,\n\nLe escribo para dar seguimiento a los pendientes y próximos pasos de la obra. Quedo atento.\n\nSaludos,\nAlex"
          : "Draft:\n\nHi team,\n\nFollowing up on open items and next steps for this job. Happy to jump on a quick call.\n\nBest,\nAlex";
  } else if (message.includes("task") || message.includes("tâche")) {
    tool = "createTask";
    reply =
      "Proposed task: “Secure site / weather readiness checklist” · priority high · assignee Site lead. Confirm to create.";
  } else if (message.includes("change order") || message.includes("ordre de changement")) {
    tool = "changeOrderToInvoice";
    reply = `When a change order is approved, Auto-Pilot can create a ${market.invoiceLabel} line and apply ${market.taxLines.map((t) => t.code).join("/")}.`;
  }

  if (process.env.OPENAI_API_KEY) {
    // Placeholder for provider adapter
  }

  return NextResponse.json({
    reply,
    tool,
    market: market.id,
    provider: process.env.OPENAI_API_KEY ? "openai" : "mock",
  });
}
