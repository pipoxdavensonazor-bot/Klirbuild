import { NextResponse } from "next/server";
import { automations } from "@/lib/mock-data";

export async function POST() {
  const active = automations.filter((a) => a.active);
  return NextResponse.json({
    ok: true,
    evaluated: active.length,
    message: "Automation runner stub executed.",
  });
}

export async function GET() {
  return POST();
}
