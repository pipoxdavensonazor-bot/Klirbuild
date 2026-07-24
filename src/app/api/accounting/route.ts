import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import {
  createJournalEntry,
  listJournalEntries,
  listLedgerAccounts,
} from "@/lib/accounting/accounting-service";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";

export const runtime = "nodejs";

async function cid(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function GET() {
  const companyId = await cid();
  if (companyId instanceof NextResponse) return companyId;
  const denied = await requireCompanyPlanFeature(companyId, "accounting");
  if (denied) return denied;
  const [accounts, entries] = await Promise.all([
    listLedgerAccounts(companyId),
    listJournalEntries(companyId),
  ]);
  return NextResponse.json({ accounts, entries });
}

export async function POST(request: Request) {
  const companyId = await cid();
  if (companyId instanceof NextResponse) return companyId;
  const denied = await requireCompanyPlanFeature(companyId, "accounting");
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const result = await createJournalEntry(companyId, {
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
