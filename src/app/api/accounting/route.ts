import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  createJournalEntry,
  listJournalEntries,
  listLedgerAccounts,
} from "@/lib/accounting/accounting-service";

export const runtime = "nodejs";

async function cid() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  return (await enrichSession(session)).companyId;
}

export async function GET() {
  const companyId = await cid();
  const [accounts, entries] = await Promise.all([
    listLedgerAccounts(companyId),
    listJournalEntries(companyId),
  ]);
  return NextResponse.json({ accounts, entries });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await createJournalEntry(await cid(), {
    date: typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10),
    memo: typeof body.memo === "string" ? body.memo : "",
    debitAccount: typeof body.debitAccount === "string" ? body.debitAccount : "",
    creditAccount: typeof body.creditAccount === "string" ? body.creditAccount : "",
    amount: typeof body.amount === "number" ? body.amount : 0,
    reference: typeof body.reference === "string" ? body.reference : undefined,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json(result);
}
