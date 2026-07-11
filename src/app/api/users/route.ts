import { NextResponse } from "next/server";
import { getRequestSession, requireSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  inviteRequiresDatabase,
  listCompanyUsers,
  listPendingInvitations,
} from "@/lib/users/invite-service";
import { can } from "@/types";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!can(session.role, "users:manage")) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  if (inviteRequiresDatabase()) {
    return NextResponse.json({
      requiresDatabase: true,
      users: [],
      invitations: [],
      message: "DATABASE_URL requis pour gérer les utilisateurs.",
    });
  }

  const companyId = session.companyId ?? DEMO_COMPANY_ID;
  const [users, invitations] = await Promise.all([
    listCompanyUsers(companyId),
    listPendingInvitations(companyId),
  ]);

  return NextResponse.json({ requiresDatabase: false, users, invitations });
}
