import { prisma } from "@/lib/db";

type Col = { column_name: string; data_type: string };

const COMPANY_COLUMNS: { name: string; sql: string }[] = [
  { name: "email", sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "email" TEXT` },
  { name: "phone", sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "phone" TEXT` },
  { name: "website", sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "website" TEXT` },
  {
    name: "marketRegion",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "marketRegion" TEXT NOT NULL DEFAULT 'CA-QC'`,
  },
  {
    name: "plan",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'starter'`,
  },
  {
    name: "subscriptionStatus",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'trialing'`,
  },
  {
    name: "stripeCustomerId",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`,
  },
  {
    name: "stripeSubscriptionId",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT`,
  },
  {
    name: "trialEndsAt",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3)`,
  },
  {
    name: "enabledModules",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "enabledModules" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  },
  {
    name: "brandingPrimary",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "brandingPrimary" TEXT NOT NULL DEFAULT '#004F6E'`,
  },
  {
    name: "brandingAccent",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "brandingAccent" TEXT NOT NULL DEFAULT '#D4AF37'`,
  },
  { name: "logoUrl", sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT` },
  { name: "emailFrom", sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "emailFrom" TEXT` },
  { name: "inboxEmail", sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "inboxEmail" TEXT` },
  {
    name: "emailSenderName",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "emailSenderName" TEXT`,
  },
  { name: "employerBn", sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "employerBn" TEXT` },
  {
    name: "zernioProfileId",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "zernioProfileId" TEXT`,
  },
  {
    name: "payrollDefaultsJson",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "payrollDefaultsJson" JSONB`,
  },
  {
    name: "suspended",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN NOT NULL DEFAULT false`,
  },
];

const USER_COLUMNS: { name: string; sql: string }[] = [
  {
    name: "emailVerified",
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3)`,
  },
  {
    name: "passwordHash",
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT`,
  },
  {
    name: "isPlatformAdmin",
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false`,
  },
  {
    name: "sessionVersion",
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0`,
  },
  { name: "image", sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT` },
  { name: "totpSecret", sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT` },
  {
    name: "totpEnabled",
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false`,
  },
];

async function listColumns(table: string): Promise<Col[]> {
  return prisma.$queryRawUnsafe<Col[]>(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = '${table}'
     ORDER BY column_name`
  );
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = '${table}'
     ) AS exists`
  );
  return Boolean(rows[0]?.exists);
}

async function ensureEnums() {
  const statements = [
    `DO $$ BEGIN
      CREATE TYPE "Plan" AS ENUM ('starter', 'growth', 'business');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN
      CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN
      CREATE TYPE "Role" AS ENUM (
        'SUPER_ADMIN', 'COMPANY_ADMIN', 'PROJECT_MANAGER', 'SITE_SUPERVISOR',
        'FOREMAN', 'FIELD_WORKER', 'ESTIMATOR', 'ACCOUNTANT', 'PAYROLL_CLERK',
        'SAFETY_OFFICER', 'HR_MANAGER', 'PROCUREMENT', 'OFFICE_ADMIN',
        'MANAGER', 'EMPLOYEE'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  ];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // ignore enum permission / already-exists races
    }
  }
}

async function ensureAccountTable() {
  const steps: { name: string; sql: string }[] = [
    {
      name: "create_table",
      sql: `CREATE TABLE IF NOT EXISTS "Account" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
    )`,
    },
    {
      name: "unique_index",
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key"
    ON "Account"("provider", "providerAccountId")`,
    },
    {
      name: "fk",
      sql: `ALTER TABLE "Account"
      ADD CONSTRAINT "Account_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE`,
    },
  ];
  const errors: { step: string; message: string }[] = [];
  for (const step of steps) {
    try {
      await prisma.$executeRawUnsafe(step.sql);
    } catch (err) {
      errors.push({
        step: step.name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return errors;
}

async function applyMissing(
  _table: string,
  columns: { name: string; sql: string }[],
  existing: Set<string>
) {
  const added: string[] = [];
  const errors: { column: string; message: string }[] = [];
  for (const col of columns) {
    if (existing.has(col.name)) continue;
    try {
      await prisma.$executeRawUnsafe(col.sql);
      added.push(col.name);
    } catch (err) {
      errors.push({
        column: col.name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { added, errors };
}

/**
 * Aligne les colonnes critiques Company/User/Account avec le schéma Prisma
 * (ADD COLUMN IF NOT EXISTS — idempotent, sûr en prod).
 */
export async function ensureProductionSchema() {
  const before = {
    company: await listColumns("Company").catch(() => [] as Col[]),
    user: await listColumns("User").catch(() => [] as Col[]),
    accountExists: await tableExists("Account").catch(() => false),
  };

  await ensureEnums();

  const companyExisting = new Set(before.company.map((c) => c.column_name));
  const userExisting = new Set(before.user.map((c) => c.column_name));

  const company = await applyMissing("Company", COMPANY_COLUMNS, companyExisting);
  const user = await applyMissing("User", USER_COLUMNS, userExisting);

  const accountErrors = await ensureAccountTable();
  const accountExistsAfter = await tableExists("Account").catch(() => false);
  const accountCreated = !before.accountExists && accountExistsAfter;

  const after = {
    company: (await listColumns("Company").catch(() => [] as Col[])).map(
      (c) => c.column_name
    ),
    user: (await listColumns("User").catch(() => [] as Col[])).map((c) => c.column_name),
    accountExists: accountExistsAfter,
  };

  let companySelectOk = false;
  let companySelectError: string | null = null;
  try {
    await prisma.company.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        emailFrom: true,
        inboxEmail: true,
        emailSenderName: true,
        plan: true,
        subscriptionStatus: true,
        enabledModules: true,
        suspended: true,
      },
    });
    companySelectOk = true;
  } catch (err) {
    companySelectError = err instanceof Error ? err.message : String(err);
  }

  let accountSelectOk = false;
  let accountSelectError: string | null = null;
  try {
    await prisma.account.findFirst({
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        userId: true,
      },
    });
    accountSelectOk = true;
  } catch (err) {
    accountSelectError = err instanceof Error ? err.message : String(err);
  }

  return {
    ok:
      companySelectOk &&
      accountSelectOk &&
      company.errors.length === 0 &&
      user.errors.length === 0,
    companySelectOk,
    companySelectError,
    accountSelectOk,
    accountSelectError,
    accountCreated,
    accountExists: after.accountExists,
    accountErrors,
    added: { company: company.added, user: user.added },
    errors: { company: company.errors, user: user.errors },
    columnsBefore: {
      company: before.company.map((c) => c.column_name),
      user: before.user.map((c) => c.column_name),
    },
    columnsAfter: after,
  };
}
