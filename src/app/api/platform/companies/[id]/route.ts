import { NextResponse } from "next/server";
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { prisma } from "@/lib/db";
import type { Plan, SubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await requirePlatformAdmin();
  if (isPlatformAdminResponse(gate)) return gate;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const data: {
    plan?: Plan;
    subscriptionStatus?: SubscriptionStatus;
    suspended?: boolean;
    enabledModules?: string[];
  } = {};

  if (typeof body.plan === "string") data.plan = body.plan as Plan;
  if (typeof body.subscriptionStatus === "string") {
    data.subscriptionStatus = body.subscriptionStatus as SubscriptionStatus;
  }
  if (typeof body.suspended === "boolean") data.suspended = body.suspended;
  if (Array.isArray(body.enabledModules)) {
    data.enabledModules = body.enabledModules.map(String);
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true, company });
}
