import { invoices, kpi } from "@/lib/mock-data";
import { recipesForRegion } from "@/lib/markets/automations";
import { calcMarketTaxes, getMarket, type MarketRegionId } from "@/lib/markets/regions";
import { weatherAlertsFor } from "@/lib/markets/weather";

export function mockKeywordReply(message: string, regionId: MarketRegionId) {
  const lower = message.toLowerCase();
  const market = getMarket(regionId);

  let tool = "weeklyBusinessSummary";
  let reply = `KlirBuild · ${market.label} (${market.currency}). Revenus MTD ${kpi.revenue.toLocaleString("fr-CA", { style: "currency", currency: market.currency === "XCD" ? "USD" : market.currency })}, pipeline ${kpi.pipeline.toLocaleString("fr-CA", { style: "currency", currency: market.currency === "XCD" ? "USD" : market.currency })}, ${kpi.tasksDue} tâches ouvertes. Taxes : ${market.taxLines.map((t) => t.name).join(" + ")}.`;

  if (lower.includes("overdue") || lower.includes("invoice") || lower.includes("facture")) {
    tool = "summarizeOverdueInvoices";
    const overdue = invoices.filter((i) => i.status === "overdue");
    reply = overdue.length
      ? `${overdue.length} facture(s) en retard (${market.label}) : ${overdue
          .map((i) => `${i.number} (${i.clientName})`)
          .join("; ")}. Auto-Pilot peut lancer relances J+3/J+7/J+14.`
      : "Aucune facture en retard pour le moment.";
  } else if (
    lower.includes("tax") ||
    lower.includes("tva") ||
    lower.includes("vat") ||
    lower.includes("tps") ||
    lower.includes("sales tax")
  ) {
    tool = "calcMarketTaxes";
    const tax = calcMarketTaxes(10000, regionId);
    reply = `Sur 10 000 $ avant taxes (${market.label}) : ${tax.lines
      .map((l) => `${l.name}=${l.amount}`)
      .join(", ")} → total ${tax.total} ${market.currency}.`;
  } else if (
    lower.includes("hurricane") ||
    lower.includes("ouragan") ||
    lower.includes("weather") ||
    lower.includes("météo")
  ) {
    tool = "weatherRiskBrief";
    const alerts = weatherAlertsFor(regionId);
    reply = alerts.length
      ? alerts.map((a) => `${a.title} (${a.risk}) : ${a.impact}`).join("\n")
      : `${market.label} n'a pas de pack ouragan — passez à FL ou un marché Caraïbes.`;
  } else if (
    lower.includes("auto") ||
    lower.includes("automation") ||
    lower.includes("pilot")
  ) {
    tool = "listAutoPilotRecipes";
    const recipes = recipesForRegion(regionId).filter((r) => r.advanced);
    reply = `Recettes Auto-Pilot avancées (${market.label}) :\n${recipes
      .slice(0, 6)
      .map((r) => `• ${r.name} — ${r.trigger}`)
      .join("\n")}`;
  } else if (lower.includes("email") || lower.includes("follow") || lower.includes("suivi")) {
    tool = "draftClientEmail";
    reply =
      market.defaultLocale === "fr"
        ? "Brouillon :\n\nBonjour,\n\nJe fais un suivi sur les postes ouverts et les prochaines étapes du chantier. Disponible pour un appel rapide.\n\nCordialement,\nAlex"
        : market.defaultLocale === "es"
          ? "Borrador:\n\nHola,\n\nLe escribo para dar seguimiento a los pendientes y próximos pasos de la obra. Quedo atento.\n\nSaludos,\nAlex"
          : "Draft:\n\nHi team,\n\nFollowing up on open items and next steps for this job. Happy to jump on a quick call.\n\nBest,\nAlex";
  } else if (lower.includes("task") || lower.includes("tâche")) {
    tool = "createTask";
    reply =
      "Tâche proposée : « Sécuriser le chantier / checklist météo » · priorité haute · responsable chef de chantier. Confirmez pour créer.";
  } else if (lower.includes("change order") || lower.includes("ordre de changement") || lower.includes(" oc")) {
    tool = "changeOrderToInvoice";
    reply = `Quand un OC est approuvé, Auto-Pilot peut créer une ligne de ${market.invoiceLabel} avec ${market.taxLines.map((t) => t.code).join("/")}.`;
  } else if (
    lower.includes("chantier") ||
    lower.includes("construction") ||
    lower.includes("budget") ||
    lower.includes("ccq")
  ) {
    tool = "constructionBrief";
    reply =
      "Mode démo local : connectez OPENAI_API_KEY pour des réponses construction intelligentes basées sur vos chantiers réels. En attendant, consultez Construction OS → Chantiers et IA Chantier.";
  }

  return { reply, tool, market: market.id };
}
