import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";

export type AutomationRunResult = {
  automationId: string;
  name: string;
  trigger: string;
  fired: boolean;
  detail: string;
};

async function evaluateTrigger(
  companyId: string,
  trigger: string
): Promise<{ fired: boolean; detail: string }> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  switch (trigger) {
    case "invoice_overdue": {
      const count = await prisma.invoice.count({
        where: {
          companyId,
          status: { in: ["sent", "overdue"] },
          dueDate: { lt: now },
        },
      });
      return {
        fired: count > 0,
        detail: `${count} facture(s) en retard`,
      };
    }
    case "lead_created": {
      const count = await prisma.lead.count({
        where: { companyId, createdAt: { gte: dayAgo } },
      });
      return {
        fired: count > 0,
        detail: `${count} nouveau(x) lead(s) (24h)`,
      };
    }
    case "deal_stale": {
      const count = await prisma.deal.count({
        where: {
          companyId,
          stage: { notIn: ["won", "lost"] },
          updatedAt: { lt: weekAgo },
        },
      });
      return {
        fired: count > 0,
        detail: `${count} deal(s) sans activité (7j)`,
      };
    }
    case "quote_expiring": {
      const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const count = await prisma.quote.count({
        where: {
          companyId,
          status: "sent",
          validUntil: { lte: inThreeDays, gte: now },
        },
      });
      return {
        fired: count > 0,
        detail: `${count} devis expire(nt) bientôt`,
      };
    }
    case "manual":
    default:
      return { fired: true, detail: "Exécution manuelle" };
  }
}

export async function runAllActiveAutomations(companyId?: string) {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis." as const };
  }

  const companies = companyId
    ? [{ id: companyId }]
    : await prisma.company.findMany({ select: { id: true } });

  const results: AutomationRunResult[] = [];

  for (const company of companies) {
    const automations = await prisma.automation.findMany({
      where: { companyId: company.id, active: true },
    });

    for (const auto of automations) {
      const evalResult = await evaluateTrigger(company.id, auto.trigger);
      if (!evalResult.fired) {
        results.push({
          automationId: auto.id,
          name: auto.name,
          trigger: auto.trigger,
          fired: false,
          detail: evalResult.detail,
        });
        continue;
      }

      await prisma.automation.update({
        where: { id: auto.id },
        data: { runs: { increment: 1 }, lastRunAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          companyId: company.id,
          action: "automation.run",
          meta: { automationId: auto.id, trigger: auto.trigger, detail: evalResult.detail },
        },
      });

      results.push({
        automationId: auto.id,
        name: auto.name,
        trigger: auto.trigger,
        fired: true,
        detail: evalResult.detail,
      });
    }
  }

  const fired = results.filter((r) => r.fired).length;
  return { ok: true as const, evaluated: results.length, fired, results };
}

export async function runSingleAutomation(companyId: string, id: string) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };

  const auto = await prisma.automation.findFirst({
    where: { id, companyId, active: true },
  });
  if (!auto) return { error: "Automatisation introuvable." as const };

  const evalResult = await evaluateTrigger(companyId, auto.trigger);
  if (!evalResult.fired) {
    return {
      ok: true as const,
      fired: false,
      name: auto.name,
      detail: evalResult.detail,
    };
  }

  await prisma.automation.update({
    where: { id },
    data: { runs: { increment: 1 }, lastRunAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      companyId,
      action: "automation.run",
      meta: { automationId: id, trigger: auto.trigger, detail: evalResult.detail },
    },
  });

  return { ok: true as const, fired: true, name: auto.name, detail: evalResult.detail };
}
