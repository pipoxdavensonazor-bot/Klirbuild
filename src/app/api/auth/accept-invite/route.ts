import { NextResponse } from "next/server";
import { acceptInvitation } from "@/lib/users/invite-service";
import { sessionResponse } from "@/lib/auth/auth-service";
import { rateLimitResponse } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "accept-invite", { limit: 15 });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || !name || !password) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }

  const result = await acceptInvitation({ token, name, password });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (!result.user) {
    return NextResponse.json({ error: "Acceptation échouée" }, { status: 500 });
  }

  return await sessionResponse(result.user);
}
