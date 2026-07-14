import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { createClient, listClients } from "@/lib/clients/client-service";
import type { ClientStatus } from "@/types";

export async function GET() {
  const session = await getRequestSession();
  const companyId = session?.companyId ?? DEMO_COMPANY_ID;
  const clients = await listClients(companyId);
  return NextResponse.json({ clients, companyId });
}

export async function POST(request: Request) {
  const session = await getRequestSession();
  const companyId = session?.companyId ?? DEMO_COMPANY_ID;
  const body = await request.json().catch(() => ({}));

  const name = typeof body.name === "string" ? body.name : "";
  const email = typeof body.email === "string" ? body.email : "";
  const phone = typeof body.phone === "string" ? body.phone : "";
  const industry = typeof body.industry === "string" ? body.industry : "";
  const city = typeof body.city === "string" ? body.city : "";
  const ownerName = typeof body.ownerName === "string" ? body.ownerName : "";
  const status =
    typeof body.status === "string" ? (body.status as ClientStatus) : "lead";

  const result = await createClient({
    companyId,
    name,
    email,
    phone,
    industry,
    city,
    ownerName,
    status,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ client: result.client }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  const { enrichSession } = await import("@/lib/auth/auth-service");
  const enriched = await enrichSession(session);
  const id = new URL(request.url).searchParams.get("id")?.trim() || "";
  if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });

  const client = (await listClients(enriched.companyId)).find((c) => c.id === id);
  const { requestSensitiveDelete } = await import(
    "@/lib/admin/delete-governance-service"
  );
  const result = await requestSensitiveDelete({
    companyId: enriched.companyId,
    role: enriched.role,
    email: enriched.email,
    resourceType: "client",
    resourceId: id,
    resourceLabel: client?.name,
    reason: "Suppression client demandée depuis CRM",
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
