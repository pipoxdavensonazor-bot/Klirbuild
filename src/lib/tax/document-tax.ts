import {
  calcMarketTaxes,
  getMarket,
  type MarketRegionId,
} from "@/lib/markets/regions";

export type LineItemInput = {
  description: string;
  /** Unité : Sac, Boîtes, m², h, forfait… */
  unit?: string;
  quantity: number;
  unitPrice: number;
};

export type ComputedLineItem = LineItemInput & {
  total: number;
};

export type TaxBreakdown = {
  regionId: MarketRegionId;
  regionLabel: string;
  currency: string;
  subtotal: number;
  taxLines: { code: string; name: string; rate: number; amount: number }[];
  taxTotal: number;
  total: number;
  items: ComputedLineItem[];
};

export function computeLineItems(items: LineItemInput[]): ComputedLineItem[] {
  return items
    .filter(
      (i) =>
        (i.description.trim() || (i.unit ?? "").trim()) &&
        i.quantity > 0 &&
        i.unitPrice >= 0
    )
    .map((i) => ({
      ...i,
      description: i.description.trim() || (i.unit ?? "").trim() || "Article",
      unit: (i.unit ?? "").trim() || undefined,
      total: Math.round(i.quantity * i.unitPrice * 100) / 100,
    }));
}

export function computeDocumentTax(
  items: LineItemInput[],
  regionId: MarketRegionId = "CA-QC"
): TaxBreakdown {
  const computed = computeLineItems(items);
  const subtotal = Math.round(computed.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const taxes = calcMarketTaxes(subtotal, regionId);
  const market = getMarket(regionId);
  return {
    regionId,
    regionLabel: market.label,
    currency: market.currency,
    subtotal,
    taxLines: taxes.lines,
    taxTotal: taxes.taxTotal,
    total: taxes.total,
    items: computed,
  };
}
