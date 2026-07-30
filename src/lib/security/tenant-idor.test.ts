import { beforeEach, describe, expect, it, vi } from "vitest";

const leadUpdateMany = vi.fn();
const leadFindFirst = vi.fn();
const dealUpdateMany = vi.fn();
const dealFindFirst = vi.fn();
const documentUpdateMany = vi.fn();
const documentFindFirst = vi.fn();
const documentFolderFindFirst = vi.fn();
const documentFolderCreate = vi.fn();
const automationUpdateMany = vi.fn();
const automationFindFirst = vi.fn();

vi.mock("@/lib/auth/auth-service", () => ({
  hasDatabase: () => true,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    lead: {
      updateMany: (...args: unknown[]) => leadUpdateMany(...args),
      findFirst: (...args: unknown[]) => leadFindFirst(...args),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    deal: {
      updateMany: (...args: unknown[]) => dealUpdateMany(...args),
      findFirst: (...args: unknown[]) => dealFindFirst(...args),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    document: {
      updateMany: (...args: unknown[]) => documentUpdateMany(...args),
      findFirst: (...args: unknown[]) => documentFindFirst(...args),
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    folder: {
      findFirst: (...args: unknown[]) => documentFolderFindFirst(...args),
      create: (...args: unknown[]) => documentFolderCreate(...args),
    },
    automation: {
      updateMany: (...args: unknown[]) => automationUpdateMany(...args),
      findFirst: (...args: unknown[]) => automationFindFirst(...args),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { upsertLead, upsertDeal } from "@/lib/crm/crm-service";
import { upsertDocument } from "@/lib/documents/document-service";
import { upsertAutomation } from "@/lib/automations/automation-service";

describe("tenant IDOR guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentFolderFindFirst.mockResolvedValue({ id: "folder_1", name: "Général" });
  });

  it("refuse l’update d’un lead hors tenant", async () => {
    leadUpdateMany.mockResolvedValue({ count: 0 });
    const result = await upsertLead("company_a", {
      id: "lead_other",
      name: "Hijack",
    });
    expect(result).toEqual({ error: "Lead introuvable." });
    expect(leadUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead_other", companyId: "company_a" },
      })
    );
  });

  it("refuse l’update d’un deal hors tenant", async () => {
    dealUpdateMany.mockResolvedValue({ count: 0 });
    const result = await upsertDeal("company_a", {
      id: "deal_other",
      title: "Hijack",
    });
    expect(result).toEqual({ error: "Deal introuvable." });
    expect(dealUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal_other", companyId: "company_a" },
      })
    );
  });

  it("refuse l’update d’un document hors tenant", async () => {
    documentUpdateMany.mockResolvedValue({ count: 0 });
    const result = await upsertDocument("company_a", {
      id: "doc_other",
      name: "secret.pdf",
    });
    expect(result).toEqual({ error: "Document introuvable." });
    expect(documentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "doc_other", companyId: "company_a", deletedAt: null },
      })
    );
  });

  it("refuse l’update d’une automation hors tenant", async () => {
    automationUpdateMany.mockResolvedValue({ count: 0 });
    const result = await upsertAutomation("company_a", {
      id: "auto_other",
      name: "Hijack",
      trigger: "invoice.overdue",
    });
    expect(result).toEqual({ error: "Automatisation introuvable." });
    expect(automationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "auto_other", companyId: "company_a" },
      })
    );
  });

  it("met à jour un lead uniquement dans le bon tenant", async () => {
    const now = new Date();
    leadUpdateMany.mockResolvedValue({ count: 1 });
    leadFindFirst.mockResolvedValue({
      id: "lead_1",
      companyId: "company_a",
      name: "Ok",
      email: null,
      source: null,
      status: "new",
      score: 0,
      ownerName: null,
      createdAt: now,
    });
    const result = await upsertLead("company_a", { id: "lead_1", name: "Ok" });
    expect("lead" in result && result.lead?.id).toBe("lead_1");
    expect(leadUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead_1", companyId: "company_a" },
      })
    );
  });
});
