import { prisma } from "@/lib/db";

type Col = { column_name: string; data_type: string };

/** Colonnes scalaires Company attendues par Prisma (hors relations). */
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
    name: "createdAt",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  },
  {
    name: "updatedAt",
    sql: `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  },
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
    `SELECT a.attname AS column_name,
            pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
     FROM pg_catalog.pg_attribute a
     JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
     JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = current_schema()
       AND c.relkind = 'r'
       AND c.relname IN ('${table}', lower('${table}'))
       AND a.attnum > 0
       AND NOT a.attisdropped
     ORDER BY a.attname`
  );
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_class c
       JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public' AND c.relname = '${table}' AND c.relkind = 'r'
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
      // ignore
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
  columns: { name: string; sql: string }[],
  existing: Set<string>
) {
  const added: string[] = [];
  const errors: { column: string; message: string }[] = [];
  const pendingSql: string[] = [];
  for (const col of columns) {
    if (existing.has(col.name)) continue;
    pendingSql.push(col.sql + ";");
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
  return { added, errors, pendingSql };
}

/**
 * Aligne / diagnostique le schéma prod pour Google OAuth.
 * Si le rôle DB n'est pas owner, retourne le SQL à coller dans Supabase SQL Editor.
 */
export async function ensureProductionSchema() {
  const before = {
    company: await listColumns("Company").catch(() => [] as Col[]),
    user: await listColumns("User").catch(() => [] as Col[]),
    account: await listColumns("Account").catch(() => [] as Col[]),
    accountExists: await tableExists("Account").catch(() => false),
  };

  await ensureEnums();

  const companyExisting = new Set(before.company.map((c) => c.column_name));
  const userExisting = new Set(before.user.map((c) => c.column_name));

  const company = await applyMissing(COMPANY_COLUMNS, companyExisting);
  const user = await applyMissing(USER_COLUMNS, userExisting);
  const accountErrors = await ensureAccountTable();

  const after = {
    company: (await listColumns("Company").catch(() => [] as Col[])).map(
      (c) => c.column_name
    ),
    user: (await listColumns("User").catch(() => [] as Col[])).map((c) => c.column_name),
    account: (await listColumns("Account").catch(() => [] as Col[])).map(
      (c) => c.column_name
    ),
    accountExists: await tableExists("Account").catch(() => false),
  };

  let companyPartialOk = false;
  let companyFullOk = false;
  let companyFullError: string | null = null;
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
    companyPartialOk = true;
  } catch (err) {
    companyFullError = err instanceof Error ? err.message : String(err);
  }
  try {
    // RETURNING * path — surfaces the real missing column name
    await prisma.company.findFirst();
    companyFullOk = true;
  } catch (err) {
    companyFullError = err instanceof Error ? err.message : String(err);
  }

  let accountOk = false;
  let accountError: string | null = null;
  try {
    await prisma.account.findFirst();
    accountOk = true;
  } catch (err) {
    accountError = err instanceof Error ? err.message : String(err);
  }

  let createOk = false;
  let createError: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: "__schema_probe__",
          email: "schema-probe@klirbuild.invalid",
          emailFrom: "schema-probe@klirbuild.invalid",
          inboxEmail: "schema-probe@inbox.klirline.ca",
          emailSenderName: "Schema Probe",
          plan: "starter",
          subscriptionStatus: "trialing",
          enabledModules: ["construction-os", "crm"],
        },
      });
      const user = await tx.user.create({
        data: {
          name: "Schema Probe",
          email: `schema-probe-${Date.now()}@klirbuild.invalid`,
          passwordHash: "probe-not-a-real-hash",
          role: "COMPANY_ADMIN",
          companyId: company.id,
          emailVerified: new Date(),
        },
      });
      await tx.account.create({
        data: {
          userId: user.id,
          provider: "google",
          providerAccountId: `probe-${Date.now()}`,
        },
      });
      // force rollback
      throw new Error("SCHEMA_PROBE_ROLLBACK");
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("SCHEMA_PROBE_ROLLBACK")) {
      createOk = true;
    } else {
      createError = msg;
    }
  }

  const missingCompany = COMPANY_COLUMNS.map((c) => c.name).filter(
    (n) => !after.company.includes(n)
  );
  const missingUser = USER_COLUMNS.map((c) => c.name).filter(
    (n) => !after.user.includes(n)
  );

  const sqlForOwner = [
    "-- Run as table owner (Supabase SQL Editor / postgres role)",
    ...company.pendingSql,
    ...user.pendingSql,
  ].filter((line, i, arr) => arr.indexOf(line) === i);

  const notOwner =
    company.errors.some((e) => /must be owner/i.test(e.message)) ||
    user.errors.some((e) => /must be owner/i.test(e.message));

  return {
    ok: companyFullOk && accountOk && createOk,
    notOwner,
    companyPartialOk,
    companyFullOk,
    companyFullError,
    accountOk,
    accountError,
    createOk,
    createError,
    missingCompany,
    missingUser,
    accountErrors,
    added: { company: company.added, user: user.added },
    errors: { company: company.errors, user: user.errors },
    columnsBefore: {
      company: before.company.map((c) => c.column_name),
      user: before.user.map((c) => c.column_name),
      account: before.account.map((c) => c.column_name),
    },
    columnsAfter: after,
    sqlForOwner,
    note: createOk
      ? "Probe Company+User+Account OK — réessayez Continuer avec Google."
      : "Probe create a échoué — voir createError / sqlForOwner.",
  };
}
