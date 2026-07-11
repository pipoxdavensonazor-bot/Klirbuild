import { NextResponse } from "next/server";
import { getInvitationByToken } from "@/lib/users/invite-service";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    return NextResponse.json({ error: "Invitation invalide ou expirée" }, { status: 404 });
  }
  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    companyName: invitation.company.name,
    expiresAt: invitation.expiresAt.toISOString(),
  });
}
