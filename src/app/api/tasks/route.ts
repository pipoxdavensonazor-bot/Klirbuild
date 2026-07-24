import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { deleteTask, listTasks, upsertTask } from "@/lib/tasks/task-service";

export const runtime = "nodejs";

async function companyId(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function GET() {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const tasks = await listTasks(cid);
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
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
