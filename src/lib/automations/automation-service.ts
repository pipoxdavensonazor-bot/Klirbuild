import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { automations as mockAutomations } from "@/lib/mock-data";

export type AutomationDto = {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  runs: number;
  lastRunAt?: string;
};

function mapAuto(row: {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  runs: number;
  lastRunAt: Date | null;
}): AutomationDto {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    active: row.active,
    runs: row.runs,
    lastRunAt: row.lastRunAt?.toISOString(),
  };
}

export async function listAutomations(companyId: string): Promise<AutomationDto[]> {
  if (hasDatabase()) {
    const rows = await prisma.automation.findMany({
      where: { companyId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapAuto);
  }
  return mockAutomations.map((a) => ({
    id: a.id,
    name: a.name,
    trigger: a.trigger,
    active: a.active,
    runs: a.runs,
    lastRunAt: a.lastRun,
  }));
}

export async function upsertAutomation(
  companyId: string,
  input: { id?: string; name: string; trigger: string; active?: boolean }
) {
  const name = input.name.trim();
  if (!name) return { error: "Nom requis." as const };
  if (!hasDatabase()) return { automation: { id: `auto_${Date.now()}`, name } };

  if (input.id) {
    const row = await prisma.automation.update({
      where: { id: input.id },
      data: {
        name,
        trigger: input.trigger,
        active: input.active ?? undefined,
      },
    });
    return { automation: mapAuto(row) };
  }

  const row = await prisma.automation.create({
    data: {
      companyId,
      name,
      trigger: input.trigger,
      active: input.active ?? true,
    },
  });
  return { automation: mapAuto(row) };
}

export async function runAutomation(companyId: string, id: string) {
  if (!hasDatabase()) return { ok: true, demo: true };
  const row = await prisma.automation.findFirst({ where: { id, companyId, active: true } });
  if (!row) return { error: "Automatisation introuvable." as const };
  await prisma.automation.update({
    where: { id },
    data: { runs: { increment: 1 }, lastRunAt: new Date() },
  });
  return { ok: true as const, name: row.name };
}
