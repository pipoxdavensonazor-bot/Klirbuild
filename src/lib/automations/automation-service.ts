import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import {
  runAllActiveAutomations,
  runSingleAutomation,
} from "@/lib/automations/automation-runner";

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
  if (!hasDatabase()) return [];
  const rows = await prisma.automation.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapAuto);
}

export async function upsertAutomation(
  companyId: string,
  input: { id?: string; name: string; trigger: string; active?: boolean }
) {
  const name = input.name.trim();
  if (!name) return { error: "Nom requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE as const };

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
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE as const };
  return runSingleAutomation(companyId, id);
}

export async function runCompanyAutomations(companyId: string) {
  return runAllActiveAutomations(companyId);
}
