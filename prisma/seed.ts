import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { generatePayslip } from "../src/lib/workforce/payroll";

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
      name: "KlirBuild Demo Co",
      email: "billing@klirline.demo",
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
    },
    update: {},
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
      sinMasked: "***-***-288",
      status: "active",
    },
    update: {},
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

  console.log("Seed OK:", company.name, "— alex@klirline.demo / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
