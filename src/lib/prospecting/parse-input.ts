import { isAmericasRegion, type AmericasRegionId } from "@/lib/prospecting/americas";
import {
  isProspectFocus,
  isProspectSector,
  type ProspectFocus,
  type ProspectSectorId,
} from "@/lib/prospecting/sectors";

export type ScanInput = {
  region: AmericasRegionId;
  sector: ProspectSectorId;
  focus: ProspectFocus;
  extraWebsites?: string[];
  createdByEmail?: string;
};

export function parseScanInput(body: {
  region?: unknown;
  sector?: unknown;
  focus?: unknown;
  extraWebsites?: unknown;
}): ScanInput | { error: string } {
  const region = typeof body.region === "string" ? body.region : "americas";
  const sector = typeof body.sector === "string" ? body.sector : "all";
  const focus = typeof body.focus === "string" ? body.focus : "mix";
  if (!isAmericasRegion(region)) return { error: "Région invalide." };
  if (!isProspectSector(sector)) return { error: "Secteur invalide." };
  if (!isProspectFocus(focus)) return { error: "Focus invalide." };
  const extraWebsites = Array.isArray(body.extraWebsites)
    ? body.extraWebsites.filter((v): v is string => typeof v === "string")
    : [];
  return { region, sector, focus, extraWebsites };
}
