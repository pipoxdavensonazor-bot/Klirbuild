import { beforeEach, describe, expect, it, vi } from "vitest";

const projectFindFirst = vi.fn();
const taskCreate = vi.fn();
const taskFindFirst = vi.fn();
const taskUpdateMany = vi.fn();

vi.mock("@/lib/auth/auth-service", () => ({
  hasDatabase: () => true,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    project: { findFirst: (...args: unknown[]) => projectFindFirst(...args) },
    task: {
      create: (...args: unknown[]) => taskCreate(...args),
      findFirst: (...args: unknown[]) => taskFindFirst(...args),
      updateMany: (...args: unknown[]) => taskUpdateMany(...args),
      deleteMany: vi.fn(),
    },
  },
}));

import { upsertTask } from "@/lib/tasks/task-service";

describe("task project tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse un projectId hors tenant", async () => {
    projectFindFirst.mockResolvedValue(null);
    const result = await upsertTask("company_a", {
      title: "Hack",
      projectId: "project_other",
    });
    expect(result).toEqual({ error: "Projet introuvable." });
    expect(taskCreate).not.toHaveBeenCalled();
    expect(projectFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "project_other", companyId: "company_a" },
      })
    );
  });

  it("crée une tâche seulement si le projet appartient au tenant", async () => {
    projectFindFirst.mockResolvedValue({ id: "project_a" });
    const now = new Date();
    taskCreate.mockResolvedValue({
      id: "task_1",
      title: "Ok",
      status: "todo",
      priority: "medium",
      assigneeName: null,
      startDate: null,
      dueDate: null,
      projectId: "project_a",
      createdAt: now,
      project: { name: "Site" },
    });
    const result = await upsertTask("company_a", {
      title: "Ok",
      projectId: "project_a",
    });
    expect("task" in result && result.task?.id).toBe("task_1");
    expect(taskCreate).toHaveBeenCalled();
  });
});
