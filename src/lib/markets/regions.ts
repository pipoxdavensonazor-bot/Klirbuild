/** KlirBuild Markets Engine — US · Canada · Caribbean */

export type MarketRegionId =
  | "CA-QC"
  | "CA-ON"
  | "US-FL"
  | "US-NY"
  | "US-TX"
  | "US-CA"
  | "US-GA"
  | "CB-HT"
  | "CB-DO"
  | "CB-JM"
  | "CB-TT"
  | "CB-BB"
  | "CB-GD"
  | "CB-LC"
  | "CB-VC";

export type CurrencyCode = "CAD" | "USD" | "HTG" | "DOP" | "JMD" | "TTD" | "BBD" | "XCD";

export type LocaleCode = "en" | "fr" | "es";

export type TaxLine = {
  code: string;
  name: string;
  rate: number; // decimal e.g. 0.05
};

export type PayrollRegime =
  | "ca_federal_qc"
  | "ca_federal_on"
  | "us_federal_state"
  | "caribbean_nis";

export type CompliancePackId =
  | "ccq"
  | "osha"
  | "lien_us"
  | "vat_caribbean"
  | "hurricane"
  | "work_permit"
  | "t4"
  | "w2_1099";

export type MarketProfile = {
  id: MarketRegionId;
  label: string;
  country: string;
  zone: "canada" | "united_states" | "caribbean";
  currency: CurrencyCode;
  locales: LocaleCode[];
  defaultLocale: LocaleCode;
  timezone: string;
  taxLines: TaxLine[];
  payrollRegime: PayrollRegime;
  compliance: CompliancePackId[];
  retainageDefault: number;
  invoiceLabel: string;
  highlights: string[];
};

export const marketProfiles: MarketProfile[] = [
  {
    id: "CA-QC",
    label: "Canada — Québec",
    country: "Canada",
    zone: "canada",
    currency: "CAD",
    locales: ["fr", "en"],
    defaultLocale: "fr",
    timezone: "America/Montreal",
    taxLines: [
      { code: "GST", name: "TPS", rate: 0.05 },
      { code: "QST", name: "TVQ", rate: 0.09975 },
    ],
    payrollRegime: "ca_federal_qc",
    compliance: ["ccq", "t4"],
    retainageDefault: 0.1,
    invoiceLabel: "Facture / Progress claim",
    highlights: ["CCQ", "TPS/TVQ", "T4", "Retenue 10%"],
  },
  {
    id: "CA-ON",
    label: "Canada — Ontario",
    country: "Canada",
    zone: "canada",
    currency: "CAD",
    locales: ["en", "fr"],
    defaultLocale: "en",
    timezone: "America/Toronto",
    taxLines: [{ code: "HST", name: "HST", rate: 0.13 }],
    payrollRegime: "ca_federal_on",
    compliance: ["t4"],
    retainageDefault: 0.1,
    invoiceLabel: "Invoice / Progress claim",
    highlights: ["HST 13%", "T4", "Holdback"],
  },
  {
    id: "US-FL",
    label: "United States — Florida",
    country: "United States",
    zone: "united_states",
    currency: "USD",
    locales: ["en", "es"],
    defaultLocale: "en",
    timezone: "America/New_York",
    taxLines: [{ code: "FL-ST", name: "FL Sales Tax", rate: 0.06 }],
    payrollRegime: "us_federal_state",
    compliance: ["osha", "lien_us", "w2_1099", "hurricane"],
    retainageDefault: 0.1,
    invoiceLabel: "AIA-style Pay Application",
    highlights: ["Sales tax", "OSHA", "Mechanic's lien", "Hurricane season"],
  },
  {
    id: "US-NY",
    label: "United States — New York",
    country: "United States",
    zone: "united_states",
    currency: "USD",
    locales: ["en", "es"],
    defaultLocale: "en",
    timezone: "America/New_York",
    taxLines: [{ code: "NY-ST", name: "NY Sales Tax", rate: 0.08875 }],
    payrollRegime: "us_federal_state",
    compliance: ["osha", "lien_us", "w2_1099"],
    retainageDefault: 0.05,
    invoiceLabel: "Pay Application",
    highlights: ["NY sales tax", "OSHA", "W-2 / 1099"],
  },
  {
    id: "US-TX",
    label: "United States — Texas",
    country: "United States",
    zone: "united_states",
    currency: "USD",
    locales: ["en", "es"],
    defaultLocale: "en",
    timezone: "America/Chicago",
    taxLines: [{ code: "TX-ST", name: "TX Sales Tax", rate: 0.0825 }],
    payrollRegime: "us_federal_state",
    compliance: ["osha", "lien_us", "w2_1099"],
    retainageDefault: 0.1,
    invoiceLabel: "Pay Application",
    highlights: ["TX sales tax", "OSHA", "Lien rights"],
  },
  {
    id: "US-CA",
    label: "United States — California",
    country: "United States",
    zone: "united_states",
    currency: "USD",
    locales: ["en", "es"],
    defaultLocale: "en",
    timezone: "America/Los_Angeles",
    taxLines: [{ code: "CA-ST", name: "CA Sales Tax", rate: 0.0725 }],
    payrollRegime: "us_federal_state",
    compliance: ["osha", "lien_us", "w2_1099"],
    retainageDefault: 0.05,
    invoiceLabel: "Pay Application",
    highlights: ["CA sales tax", "OSHA", "Prevailing wage ready"],
  },
  {
    id: "US-GA",
    label: "United States — Georgia",
    country: "United States",
    zone: "united_states",
    currency: "USD",
    locales: ["en"],
    defaultLocale: "en",
    timezone: "America/New_York",
    taxLines: [{ code: "GA-ST", name: "GA Sales Tax", rate: 0.04 }],
    payrollRegime: "us_federal_state",
    compliance: ["osha", "lien_us", "w2_1099"],
    retainageDefault: 0.1,
    invoiceLabel: "Pay Application",
    highlights: ["GA sales tax", "OSHA"],
  },
  {
    id: "CB-HT",
    label: "Haïti",
    country: "Haiti",
    zone: "caribbean",
    currency: "USD",
    locales: ["fr", "en"],
    defaultLocale: "fr",
    timezone: "America/Port-au-Prince",
    taxLines: [{ code: "TCA", name: "TCA", rate: 0.1 }],
    payrollRegime: "caribbean_nis",
    compliance: ["vat_caribbean", "hurricane", "work_permit"],
    retainageDefault: 0.1,
    invoiceLabel: "Facture / Invoice",
    highlights: ["TCA 10%", "USD books", "Ouragans", "Permis travail"],
  },
  {
    id: "CB-DO",
    label: "République Dominicaine",
    country: "Dominican Republic",
    zone: "caribbean",
    currency: "USD",
    locales: ["es", "en"],
    defaultLocale: "es",
    timezone: "America/Santo_Domingo",
    taxLines: [{ code: "ITBIS", name: "ITBIS", rate: 0.18 }],
    payrollRegime: "caribbean_nis",
    compliance: ["vat_caribbean", "hurricane", "work_permit"],
    retainageDefault: 0.1,
    invoiceLabel: "Factura / Invoice",
    highlights: ["ITBIS 18%", "USD/DOP", "Huracanes"],
  },
  {
    id: "CB-JM",
    label: "Jamaica",
    country: "Jamaica",
    zone: "caribbean",
    currency: "USD",
    locales: ["en"],
    defaultLocale: "en",
    timezone: "America/Jamaica",
    taxLines: [{ code: "GCT", name: "GCT", rate: 0.15 }],
    payrollRegime: "caribbean_nis",
    compliance: ["vat_caribbean", "hurricane", "work_permit"],
    retainageDefault: 0.1,
    invoiceLabel: "Tax Invoice",
    highlights: ["GCT 15%", "NIS payroll", "Hurricane risk"],
  },
  {
    id: "CB-TT",
    label: "Trinidad & Tobago",
    country: "Trinidad and Tobago",
    zone: "caribbean",
    currency: "USD",
    locales: ["en"],
    defaultLocale: "en",
    timezone: "America/Port_of_Spain",
    taxLines: [{ code: "VAT", name: "VAT", rate: 0.125 }],
    payrollRegime: "caribbean_nis",
    compliance: ["vat_caribbean", "hurricane", "work_permit"],
    retainageDefault: 0.1,
    invoiceLabel: "VAT Invoice",
    highlights: ["VAT 12.5%", "Energy / industrial jobs"],
  },
  {
    id: "CB-BB",
    label: "Barbados",
    country: "Barbados",
    zone: "caribbean",
    currency: "USD",
    locales: ["en"],
    defaultLocale: "en",
    timezone: "America/Barbados",
    taxLines: [{ code: "VAT", name: "VAT", rate: 0.175 }],
    payrollRegime: "caribbean_nis",
    compliance: ["vat_caribbean", "hurricane", "work_permit"],
    retainageDefault: 0.1,
    invoiceLabel: "VAT Invoice",
    highlights: ["VAT 17.5%", "Tourism construction"],
  },
  {
    id: "CB-GD",
    label: "Grenada",
    country: "Grenada",
    zone: "caribbean",
    currency: "XCD",
    locales: ["en"],
    defaultLocale: "en",
    timezone: "America/Grenada",
    taxLines: [{ code: "VAT", name: "VAT", rate: 0.15 }],
    payrollRegime: "caribbean_nis",
    compliance: ["vat_caribbean", "hurricane", "work_permit"],
    retainageDefault: 0.1,
    invoiceLabel: "VAT Invoice",
    highlights: ["XCD", "VAT 15%", "OECS"],
  },
  {
    id: "CB-LC",
    label: "Saint Lucia",
    country: "Saint Lucia",
    zone: "caribbean",
    currency: "XCD",
    locales: ["en", "fr"],
    defaultLocale: "en",
    timezone: "America/St_Lucia",
    taxLines: [{ code: "VAT", name: "VAT", rate: 0.125 }],
    payrollRegime: "caribbean_nis",
    compliance: ["vat_caribbean", "hurricane", "work_permit"],
    retainageDefault: 0.1,
    invoiceLabel: "VAT Invoice",
    highlights: ["XCD", "VAT 12.5%", "Resort builds"],
  },
  {
    id: "CB-VC",
    label: "St. Vincent & the Grenadines",
    country: "Saint Vincent and the Grenadines",
    zone: "caribbean",
    currency: "XCD",
    locales: ["en"],
    defaultLocale: "en",
    timezone: "America/St_Vincent",
    taxLines: [{ code: "VAT", name: "VAT", rate: 0.16 }],
    payrollRegime: "caribbean_nis",
    compliance: ["vat_caribbean", "hurricane", "work_permit"],
    retainageDefault: 0.1,
    invoiceLabel: "VAT Invoice",
    highlights: ["XCD", "VAT 16%", "Island logistics"],
  },
];

export function getMarket(id: MarketRegionId) {
  return marketProfiles.find((m) => m.id === id) ?? marketProfiles[0];
}

export function marketsByZone(zone: MarketProfile["zone"]) {
  return marketProfiles.filter((m) => m.zone === zone);
}

export function calcMarketTaxes(subtotal: number, regionId: MarketRegionId) {
  const market = getMarket(regionId);
  const lines = market.taxLines.map((t) => ({
    ...t,
    amount: Math.round(subtotal * t.rate * 100) / 100,
  }));
  const taxTotal = lines.reduce((s, l) => s + l.amount, 0);
  return {
    market,
    lines,
    taxTotal,
    total: Math.round((subtotal + taxTotal) * 100) / 100,
  };
}
