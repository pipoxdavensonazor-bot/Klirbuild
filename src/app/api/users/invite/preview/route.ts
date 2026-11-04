import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/auth/rate-limit";
import { getInvitationByToken } from "@/lib/users/invite-service";

export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, "invite-preview", { limit: 30 });
  if (limited) return limited;

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
