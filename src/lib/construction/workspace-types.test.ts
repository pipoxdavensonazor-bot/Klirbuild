import { describe, expect, it } from "vitest";
import {
  constructionKpisFrom,
  defaultWorkspace,
} from "@/lib/construction/workspace-types";
import type { ConstructionJob, ConstructionLead } from "@/modules/construction-os/types";

function job(overrides: Partial<ConstructionJob> = {}): ConstructionJob {
  return {
    id: "job_test",
    number: "CH-TEST",
    name: "Test",
    clientName: "Client",
    address: "1 Main",
    city: "Montréal",
    province: "QC",
    status: "in_progress",
    contractValue: 100000,
    budgetCost: 80000,
    actualCost: 70000,
    progressPct: 50,
    holdbackPct: 10,
    startDate: "2026-01-01",
    superintendent: "Sam",
    trades: ["peintre"],
    ...overrides,
  };
}

function lead(overrides: Partial<ConstructionLead> = {}): ConstructionLead {
  return {
    id: "lead_test",
    name: "Lead",
    source: "web",
    projectType: "reno",
    valueEstimate: 50000,
    stage: "qualified",
    owner: "Alex",
    city: "Laval",
    ...overrides,
  };
}

describe("constructionKpisFrom", () => {
  it("counts active jobs and pipeline value", () => {
    const data = defaultWorkspace();
    data.jobs = [job(), job({ id: "job_2", status: "completed" })];
    data.leads = [lead(), lead({ stage: "won", valueEstimate: 99999 })];

    const kpis = constructionKpisFrom(data);
    expect(kpis.activeJobs).toBe(1);
    expect(kpis.contractBacklog).toBe(100000);
    expect(kpis.pipeline).toBe(50000);
  });

  it("flags margin risk when cost ratio is high and progress low", () => {
    const data = defaultWorkspace();
    data.jobs = [
      job({
        actualCost: 90000,
        budgetCost: 100000,
        progressPct: 50,
      }),
    ];

    expect(constructionKpisFrom(data).marginRisk).toBe(1);
  });
});
