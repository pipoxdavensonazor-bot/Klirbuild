import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

export async function listLedgerAccounts(companyId: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.ledgerAccount.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    balance: dec(r.balance),
  }));
}

export async function listJournalEntries(companyId: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.journalEntry.findMany({
    where: { companyId },
    orderBy: { date: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    memo: r.memo,
    reference: r.reference ?? "",
    debitAccount: r.debitAccount,
    creditAccount: r.creditAccount,
    amount: dec(r.amount),
    taxCode: r.taxCode ?? undefined,
    taxAmount: r.taxAmount ? dec(r.taxAmount) : undefined,
  }));
}

export async function createJournalEntry(
  companyId: string,
  input: {
    date: string;
    memo: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    reference?: string;
  }
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };
  const row = await prisma.journalEntry.create({
    data: {
      companyId,
      date: new Date(input.date),
      memo: input.memo,
      debitAccount: input.debitAccount,
      creditAccount: input.creditAccount,
      amount: input.amount,
      reference: input.reference ?? null,
    },
  });
  return { entry: { id: row.id } };
}
