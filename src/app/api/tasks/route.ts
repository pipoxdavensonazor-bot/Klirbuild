import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { deleteTask, listTasks, upsertTask } from "@/lib/tasks/task-service";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  const enriched = await enrichSession(session);
  return enriched.companyId;
}

export async function GET() {
  const cid = await companyId();
  const tasks = await listTasks(cid);
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const cid = await companyId();
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "upsert";

  if (action === "delete") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
    const result = await deleteTask(cid, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const result = await upsertTask(cid, {
    id: typeof body.id === "string" ? body.id : undefined,
    title: typeof body.title === "string" ? body.title : "",
    projectId: typeof body.projectId === "string" ? body.projectId : undefined,
    projectName: typeof body.projectName === "string" ? body.projectName : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
    priority: typeof body.priority === "string" ? body.priority : undefined,
    assigneeName: typeof body.assigneeName === "string" ? body.assigneeName : undefined,
    dueDate: typeof body.dueDate === "string" ? body.dueDate : undefined,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
