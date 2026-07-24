import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";
import { createClient, listClients } from "@/lib/clients/client-service";
import type { ClientStatus } from "@/types";

export async function GET() {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const clients = await listClients(auth.companyId);
  return NextResponse.json({ clients, companyId: auth.companyId });
}

export async function POST(request: Request) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const gated = await requireCompanyPlanFeature(auth.companyId, "crm");
  if (gated) return gated;
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
    companyId: auth.companyId,
    name,
    email,
    phone,
    industry,
    city,
    ownerName,
    status,
  });

  if ("error" in result && result.error) {
    const statusCode = result.error.includes("Limite") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status: statusCode });
  }

  return NextResponse.json({ client: result.client }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const id = new URL(request.url).searchParams.get("id")?.trim() || "";
  if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });

  const client = (await listClients(auth.companyId)).find((c) => c.id === id);
  const { requestSensitiveDelete } = await import(
    "@/lib/admin/delete-governance-service"
  );
  const result = await requestSensitiveDelete({
    companyId: auth.companyId,
    role: auth.session.role,
    email: auth.session.email,
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
