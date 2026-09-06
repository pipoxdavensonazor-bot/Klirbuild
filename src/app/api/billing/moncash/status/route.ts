import { NextResponse } from "next/server";
import { getMonCashEnv, isMonCashConfigured } from "@/lib/payments/moncash";

export const runtime = "nodejs";

export async function GET() {
  const configured = isMonCashConfigured();
  return NextResponse.json({
    configured,
    env: configured ? getMonCashEnv() : null,
    label: "MonCash (Digicel Haïti)",
  });
}
