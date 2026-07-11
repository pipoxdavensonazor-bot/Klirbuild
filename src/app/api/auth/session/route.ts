import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/demo-session";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    email: session.email,
    role: session.role,
    companyId: session.companyId,
  });
}
