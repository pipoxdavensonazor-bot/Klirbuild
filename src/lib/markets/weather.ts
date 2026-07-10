import type { MarketRegionId } from "@/lib/markets/regions";
import { getMarket } from "@/lib/markets/regions";

export type StormRisk = "low" | "moderate" | "high" | "extreme";

export type WeatherAlert = {
  id: string;
  regionId: MarketRegionId;
  title: string;
  risk: StormRisk;
  window: string;
  impact: string;
  autoActions: string[];
};

/** Atlantic hurricane season roughly Jun 1 – Nov 30 */
export function isHurricaneSeason(date = new Date()) {
  const m = date.getMonth() + 1;
  return m >= 6 && m <= 11;
}

export function weatherAlertsFor(regionId: MarketRegionId): WeatherAlert[] {
  const market = getMarket(regionId);
  if (!market.compliance.includes("hurricane")) return [];

  const season = isHurricaneSeason();
  if (!season) {
    return [
      {
        id: "wx_off",
        regionId,
        title: "Hors saison cyclonique",
        risk: "low",
        window: "Déc–Mai",
        impact: "Risque faible — maintenir plan de continuité.",
        autoActions: ["Revue annuelle du plan d'évacuation chantier"],
      },
    ];
  }

  return [
    {
      id: "wx_1",
      regionId,
      title: "Saison cyclonique active — Atlantique",
      risk: "high",
      window: "Juin–Novembre",
      impact:
        "Retards matériaux, fermetures ports, sécurisation structures ouvertes.",
      autoActions: [
        "Pause auto des livraisons non critiques si alerte orange",
        "Générer ordre de changement « weather delay »",
        "Notifier équipes via chat sécurisé",
        "Snapshot photos chantier avant sécurisation",
      ],
    },
    {
      id: "wx_2",
      regionId,
      title: "Fenêtre de vent fort — 72h",
      risk: "moderate",
      window: "Prochaines 72 heures",
      impact: "Grues / toitures / coffrages à risque.",
      autoActions: [
        "Bloquer pointage sur zones exposées",
        "Checklist sécurisation auto assignée au chef de chantier",
      ],
    },
  ];
}

export function riskLabel(risk: StormRisk) {
  const map: Record<StormRisk, string> = {
    low: "Faible",
    moderate: "Modéré",
    high: "Élevé",
    extreme: "Extrême",
  };
  return map[risk];
}
