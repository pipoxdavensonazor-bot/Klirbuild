import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { generatePayslip } from "../src/lib/workforce/payroll";
import {
  changeOrders,
  ccqDeclarations,
  ccqWorkers,
  constructionEstimates,
  constructionJobs,
  constructionLeads,
  marketingCampaigns,
  progressInvoices,
} from "../src/modules/construction-os/mock-data";
import { defaultWorkspace } from "../src/lib/construction/workspace-types";

const scryptAsync = promisify(scrypt);
const DEMO_COMPANY_ID = "demo_klirbuild";

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword("password");

  const company = await prisma.company.upsert({
    where: { id: DEMO_COMPANY_ID },
    create: {
      id: DEMO_COMPANY_ID,
      name: "KlirBuild",
      email: "billing@klirline.app",
      plan: "growth",
      subscriptionStatus: "trialing",
      enabledModules: ["construction-os", "crm", "payroll", "social_ads"],
      marketRegion: "CA-QC",
    },
    update: {
      enabledModules: ["construction-os", "crm", "payroll", "social_ads"],
      marketRegion: "CA-QC",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "alex@klirline.demo" },
    create: {
      name: "Alex Rivera",
      email: "alex@klirline.demo",
      passwordHash,
      role: "COMPANY_ADMIN",
      companyId: company.id,
    },
    update: { passwordHash, name: "Alex Rivera" },
  });

  await prisma.employeeProfile.upsert({
    where: { id: "emp_demo_alex" },
    create: {
      id: "emp_demo_alex",
      companyId: company.id,
      name: "Alex Rivera",
      email: user.email,
      role: "COMPANY_ADMIN",
      jobTitle: "Directeur des opérations",
      hourlyRate: 55,
      overtimeRate: 82.5,
      status: "active",
      phone: "514-555-0100",
      sinNumber: "123456782",
      sinMasked: "***-***-782",
      dateOfBirth: new Date("1985-03-15"),
      hireDate: new Date("2020-01-10"),
      contractType: "full_time",
      addressLine1: "1200 Rue Sainte-Catherine",
      city: "Montréal",
      province: "QC",
      postalCode: "H3B 1K1",
      country: "CA",
      emergencyName: "Maria Rivera",
      emergencyPhone: "514-555-0101",
      dossierComplete: true,
    },
    update: {
      phone: "514-555-0100",
      sinMasked: "***-***-782",
      dateOfBirth: new Date("1985-03-15"),
      hireDate: new Date("2020-01-10"),
      contractType: "full_time",
      addressLine1: "1200 Rue Sainte-Catherine",
      city: "Montréal",
      province: "QC",
      postalCode: "H3B 1K1",
      dossierComplete: true,
    },
  });

  const clientCount = await prisma.client.count({ where: { companyId: company.id } });
  if (clientCount === 0) {
    await prisma.client.createMany({
      data: [
        {
          companyId: company.id,
          name: "Nordic Facilities Inc.",
          email: "ops@nordic.demo",
          status: "active",
          industry: "Construction",
          city: "Toronto",
          ownerName: "Alex Rivera",
        },
        {
          companyId: company.id,
          name: "Harbour Dental Group",
          email: "admin@harbour.demo",
          status: "lead",
          industry: "Santé",
          city: "Vancouver",
          ownerName: "Alex Rivera",
        },
      ],
    });
  }

  const siteCount = await prisma.jobSite.count({ where: { companyId: company.id } });
  if (siteCount === 0) {
    await prisma.jobSite.createMany({
      data: [
        {
          companyId: company.id,
          name: "Tour Nordic — Étage 12",
          address: "100 King St W, Toronto, ON",
          lat: 43.6487,
          lng: -79.3817,
          radiusM: 150,
        },
        {
          companyId: company.id,
          name: "Clinique Harbour",
          address: "555 W Broadway, Vancouver, BC",
          lat: 49.2635,
          lng: -123.1385,
          radiusM: 120,
        },
      ],
    });
  }

  const autoCount = await prisma.automation.count({ where: { companyId: company.id } });
  if (autoCount === 0) {
    await prisma.automation.createMany({
      data: [
        {
          companyId: company.id,
          name: "Rappel factures en retard",
          trigger: "invoice_overdue",
          active: true,
        },
        {
          companyId: company.id,
          name: "Nouveau lead — notification",
          trigger: "lead_created",
          active: true,
        },
        {
          companyId: company.id,
          name: "Devis expirant (3 jours)",
          trigger: "quote_expiring",
          active: true,
        },
      ],
    });
  }

  const fieldEmp = await prisma.employeeProfile.upsert({
    where: { id: "emp_demo_sam" },
    create: {
      id: "emp_demo_sam",
      companyId: company.id,
      name: "Sam Chen",
      email: "sam@klirline.demo",
      role: "EMPLOYEE",
      jobTitle: "Ouvrier chantier",
      hourlyRate: 38,
      overtimeRate: 57,
      sinNumber: "987654321",
      sinMasked: "***-***-321",
      dateOfBirth: new Date("1992-08-22"),
      hireDate: new Date("2023-04-01"),
      contractType: "full_time",
      addressLine1: "45 Avenue du Parc",
      city: "Laval",
      province: "QC",
      postalCode: "H7N 2Y5",
      country: "CA",
      emergencyName: "Li Chen",
      emergencyPhone: "450-555-0202",
      status: "active",
      dossierComplete: true,
    },
    update: {
      sinMasked: "***-***-321",
      dateOfBirth: new Date("1992-08-22"),
      hireDate: new Date("2023-04-01"),
      contractType: "full_time",
      addressLine1: "45 Avenue du Parc",
      city: "Laval",
      province: "QC",
      postalCode: "H7N 2Y5",
      dossierComplete: true,
    },
  });

  const taxYear = new Date().getFullYear();
  const payslipCount = await prisma.payslip.count({
    where: { companyId: company.id, employeeId: fieldEmp.id },
  });
  if (payslipCount === 0) {
    const calc = generatePayslip({
      employeeId: fieldEmp.id,
      employeeName: fieldEmp.name,
      hourlyRate: 38,
      overtimeRate: 57,
      regularHours: 40 * 12,
      overtimeHours: 8,
      periodStart: `${taxYear}-01-01`,
      periodEnd: `${taxYear}-03-31`,
    });
    await prisma.payslip.create({
      data: {
        companyId: company.id,
        employeeId: fieldEmp.id,
        periodStart: new Date(`${taxYear}-01-01`),
        periodEnd: new Date(`${taxYear}-03-31`),
        regularHours: 480,
        overtimeHours: 8,
        grossPay: calc.grossPay,
        netPay: calc.netPay,
        linesJson: calc.lines,
        status: "approved",
      },
    });
  }

  const wsExisting = await prisma.constructionWorkspace.findUnique({
    where: { companyId: company.id },
  });
  const jobCount = await prisma.constructionJob.count({ where: { companyId: company.id } });
  if (jobCount === 0) {
    await prisma.constructionJob.createMany({
      data: constructionJobs.map((job) => ({
        id: job.id,
        companyId: company.id,
        number: job.number,
        name: job.name,
        clientName: job.clientName,
        address: job.address,
        city: job.city,
        province: job.province,
        status: job.status,
        contractValue: job.contractValue,
        budgetCost: job.budgetCost,
        actualCost: job.actualCost,
        progressPct: job.progressPct,
        holdbackPct: job.holdbackPct,
        startDate: job.startDate,
        endDate: job.endDate ?? null,
        superintendent: job.superintendent,
        trades: [...job.trades],
      })),
      skipDuplicates: true,
    });
  }

  const leadCount = await prisma.constructionLead.count({ where: { companyId: company.id } });
  if (leadCount === 0) {
    await prisma.constructionLead.createMany({
      data: constructionLeads.map((lead) => ({
        id: lead.id,
        companyId: company.id,
        name: lead.name,
        source: lead.source,
        projectType: lead.projectType,
        valueEstimate: lead.valueEstimate,
        stage: lead.stage,
        owner: lead.owner,
        city: lead.city,
      })),
      skipDuplicates: true,
    });
  }

  const estimateCount = await prisma.constructionEstimate.count({ where: { companyId: company.id } });
  if (estimateCount === 0) {
    await prisma.constructionEstimate.createMany({
      data: constructionEstimates.map((e) => ({
        id: e.id,
        companyId: company.id,
        number: e.number,
        jobId: e.jobId ?? null,
        clientName: e.clientName,
        title: e.title,
        status: e.status,
        subtotal: e.subtotal,
        tps: e.tps,
        tvq: e.tvq,
        total: e.total,
        validUntil: e.validUntil,
        linesJson: e.lines as object,
      })),
      skipDuplicates: true,
    });
  }

  const coCount = await prisma.constructionChangeOrder.count({ where: { companyId: company.id } });
  if (coCount === 0) {
    await prisma.constructionChangeOrder.createMany({
      data: changeOrders.map((c) => ({
        id: c.id,
        companyId: company.id,
        number: c.number,
        jobId: c.jobId,
        jobName: c.jobName,
        title: c.title,
        reason: c.reason,
        amount: c.amount,
        status: c.status,
        submittedAt: c.submittedAt ?? null,
        approvedAt: c.approvedAt ?? null,
      })),
      skipDuplicates: true,
    });
  }

  const pinvCount = await prisma.constructionProgressInvoice.count({
    where: { companyId: company.id },
  });
  if (pinvCount === 0) {
    await prisma.constructionProgressInvoice.createMany({
      data: progressInvoices.map((p) => ({
        id: p.id,
        companyId: company.id,
        jobId: p.jobId,
        jobName: p.jobName,
        number: p.number,
        periodLabel: p.periodLabel,
        completionPct: p.completionPct,
        amount: p.amount,
        holdback: p.holdback,
        netDue: p.netDue,
        status: p.status,
        dueDate: p.dueDate,
      })),
      skipDuplicates: true,
    });
  }

  const ccqCount = await prisma.constructionCcqWorker.count({ where: { companyId: company.id } });
  if (ccqCount === 0) {
    await prisma.constructionCcqWorker.createMany({
      data: ccqWorkers.map((w) => ({
        id: w.id,
        companyId: company.id,
        name: w.name,
        trade: w.trade,
        competency: w.competency,
        ccqNumber: w.ccqNumber,
        cardExpires: w.cardExpires,
        hoursThisPeriod: w.hoursThisPeriod,
        apprenticeshipRatioOk: w.apprenticeshipRatioOk,
        trainingDue: w.trainingDue ?? null,
      })),
      skipDuplicates: true,
    });
  }

  const declCount = await prisma.constructionCcqDeclaration.count({
    where: { companyId: company.id },
  });
  if (declCount === 0) {
    await prisma.constructionCcqDeclaration.createMany({
      data: ccqDeclarations.map((d) => ({
        id: d.id,
        companyId: company.id,
        workerId: d.workerId,
        workerName: d.workerName,
        jobId: d.jobId,
        jobName: d.jobName,
        trade: d.trade,
        weekEnding: d.weekEnding,
        hours: d.hours,
        status: d.status,
      })),
      skipDuplicates: true,
    });
  }

  const mktCount = await prisma.constructionMarketingCampaign.count({
    where: { companyId: company.id },
  });
  if (mktCount === 0) {
    await prisma.constructionMarketingCampaign.createMany({
      data: marketingCampaigns.map((m) => ({
        id: m.id,
        companyId: company.id,
        name: m.name,
        channel: m.channel,
        status: m.status,
        spend: m.spend,
        leads: m.leads,
        contracts: m.contracts,
        revenue: m.revenue,
      })),
      skipDuplicates: true,
    });
  }

  if (!wsExisting) {
    const seeded = defaultWorkspace();
    await prisma.constructionWorkspace.create({
      data: { companyId: company.id, data: { aiSuggestions: seeded.aiSuggestions } as object },
    });
  }

  const projectCount = await prisma.project.count({ where: { companyId: company.id } });
  if (projectCount === 0) {
    const clients = await prisma.client.findMany({
      where: { companyId: company.id },
      take: 1,
      orderBy: { createdAt: "asc" },
    });
    const client = clients[0];
    const project = await prisma.project.create({
      data: {
        companyId: company.id,
        clientId: client?.id,
        name: "Rénovation condo Plateau",
        status: "active",
        progress: 45,
        budget: 186000,
        dueDate: new Date("2026-09-30"),
      },
    });
    await prisma.task.createMany({
      data: [
        {
          projectId: project.id,
          title: "Démolition structure",
          status: "done",
          priority: "high",
          assigneeName: "Sam Chen",
          startDate: new Date("2026-04-15"),
          dueDate: new Date("2026-05-01"),
        },
        {
          projectId: project.id,
          title: "Charpenterie",
          status: "in_progress",
          priority: "high",
          assigneeName: "Sam Chen",
          startDate: new Date("2026-05-02"),
          dueDate: new Date("2026-06-15"),
        },
        {
          projectId: project.id,
          title: "Électricité",
          status: "todo",
          priority: "medium",
          assigneeName: "Jordan Lee",
          startDate: new Date("2026-06-16"),
          dueDate: new Date("2026-07-20"),
        },
        {
          projectId: project.id,
          title: "Finitions peinture",
          status: "todo",
          priority: "low",
          assigneeName: "Alex Rivera",
          startDate: new Date("2026-07-21"),
          dueDate: new Date("2026-09-15"),
        },
      ],
    });
  }

  const emailCount = await prisma.emailMessage.count({ where: { companyId: company.id } });
  if (emailCount === 0) {
    const clients = await prisma.client.findMany({
      where: { companyId: company.id },
      take: 2,
      orderBy: { createdAt: "asc" },
    });
    const nordic = clients.find((c) => c.email === "ops@nordic.demo") ?? clients[0];
    const harbour = clients.find((c) => c.email === "admin@harbour.demo") ?? clients[1];
    const inbox = company.email ?? "billing@klirline.demo";

    if (nordic) {
      await prisma.emailMessage.create({
        data: {
          companyId: company.id,
          direction: "inbound",
          fromEmail: nordic.email ?? "ops@nordic.demo",
          toEmail: inbox,
          subject: "Re: Soumission Q-2026-014 — questions",
          bodyText: "Bonjour, pouvez-vous confirmer les délais pour le lot peinture?",
          clientId: nordic.id,
        },
      });
    }
    if (harbour) {
      await prisma.emailMessage.create({
        data: {
          companyId: company.id,
          direction: "outbound",
          fromEmail: inbox,
          toEmail: harbour.email ?? "admin@harbour.demo",
          subject: `Facture INV-2026-094 — ${company.name}`,
          bodyText: "Veuillez trouver ci-joint votre facture.",
          clientId: harbour.id,
        },
      });
    }
  }

  console.log("Seed OK:", company.name, "— alex@klirline.demo / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
