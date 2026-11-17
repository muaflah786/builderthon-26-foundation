import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TaskForm } from "@/components/ops/task-form";
import { isAppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import { getTaskFormOptions } from "@/server/services/ops-tasks";

export const metadata: Metadata = { title: "Edit task" };

export default async function EditTaskPage({
  params,
}: PageProps<"/app/ops/[id]/tasks/[taskId]/edit">) {
  const user = await requireUser();
  const { id, taskId } = await params;

  let data;
  try {
    data = await getTaskFormOptions(user, id, taskId);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    if (isAppError(e) && e.code === "CONFLICT") redirect(`/app/ops/${id}/tasks/${taskId}`);
    throw e;
  }
  const task = data.task!;
  if (task.status === "done" || task.status === "cancelled") {
    redirect(`/app/ops/${id}/tasks/${taskId}`);
  }
  const { terms } = data.operation.config;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">{data.operation.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit {terms.task.toLowerCase()}</h1>
      </div>
      <TaskForm
        operationId={data.operation.id}
        terms={terms}
        teams={data.teams}
        people={data.people}
        locations={data.locations}
        allowNoTeam={data.allowNoTeam}
        initial={{
          id: task.id,
          version: task.version,
          title: task.title,
          instructions: task.instructions,
          teamId: task.teamId,
          assigneeMemberId: task.assigneeMemberId,
          locationId: task.locationId,
          dueAt: task.dueAt ? task.dueAt.toISOString() : null,
          priority: task.priority,
        }}
      />
    </div>
  );
}
