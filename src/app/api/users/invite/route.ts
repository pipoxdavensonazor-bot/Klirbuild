import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import { createInvitation } from "@/lib/users/invite-service";
import { can, type Role } from "@/types";

export const runtime = "nodejs";

const ALLOWED_ROLES: Role[] = ["COMPANY_ADMIN", "MANAGER", "EMPLOYEE"];

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    if (!can(session.role, "users:manage")) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const role =
      typeof body.role === "string" && ALLOWED_ROLES.includes(body.role as Role)
        ? (body.role as Role)
        : "EMPLOYEE";

    const result = await createInvitation({
      companyId: session.companyId,
      email,
      role,
      invitedByEmail: session.email,
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/users/invite]", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'invitation. Reconnectez-vous et réessayez." },
      { status: 500 }
    );
  }
}
