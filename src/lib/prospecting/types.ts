export type DiscoveredCompany = {
  name: string;
  website: string | null;
  country: string | null;
  sector: string | null;
  source: string;
  sourceUrl: string | null;
  inception: string | null;
};

export type ProspectHitDto = {
  id: string;
  name: string;
  website: string;
  email: string;
  country: string;
  sector: string;
  source: string;
  sourceUrl: string;
  notes: string;
  score: number;
  importedLeadId: string;
  createdAt: string;
};

export type ProspectScanDto = {
  id: string;
  region: string;
  sector: string;
  focus: string;
  status: string;
  error: string;
  discovered: number;
  withEmail: number;
  createdAt: string;
  finishedAt: string;
  hits: ProspectHitDto[];
};
