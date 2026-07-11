import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

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
      enabledModules: ["construction-os", "crm", "payroll"],
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "alex@klirline.demo" },
    create: {
      name: "Alex Demo",
      email: "alex@klirline.demo",
      passwordHash,
      role: "COMPANY_ADMIN",
      companyId: company.id,
    },
    update: { passwordHash },
  });

  console.log("Seed OK:", company.name, "— alex@klirline.demo / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
