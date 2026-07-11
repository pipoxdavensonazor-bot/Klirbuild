import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import {
  inviteRequiresDatabase,
  listCompanyUsers,
  listPendingInvitations,
} from "@/lib/users/invite-service";
import { can } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
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

    const [users, invitations] = await Promise.all([
      listCompanyUsers(session.companyId),
      listPendingInvitations(session.companyId),
    ]);

    return NextResponse.json({ requiresDatabase: false, users, invitations });
  } catch (error) {
    console.error("[api/users]", error);
    return NextResponse.json(
      { error: "Impossible de charger les utilisateurs." },
      { status: 500 }
    );
  }
}
