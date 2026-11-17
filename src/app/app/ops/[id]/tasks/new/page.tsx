import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TaskForm } from "@/components/ops/task-form";
import { isAppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import { getTaskFormOptions } from "@/server/services/ops-tasks";

export const metadata: Metadata = { title: "New task" };

export default async function NewTaskPage({ params }: PageProps<"/app/ops/[id]/tasks/new">) {
  const user = await requireUser();
  const { id } = await params;

  let data;
  try {
    data = await getTaskFormOptions(user, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    if (isAppError(e) && e.code === "CONFLICT") redirect(`/app/ops/${id}`);
    throw e;
  }
  const { terms } = data.operation.config;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">{data.operation.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">New {terms.task.toLowerCase()}</h1>
        <p className="text-muted-foreground text-sm">
          Choose a {terms.team.toLowerCase()} so anyone in it can take it, or a person so only they
          can.
        </p>
      </div>
      <TaskForm
        operationId={data.operation.id}
        terms={terms}
        teams={data.teams}
        people={data.people}
        locations={data.locations}
        allowNoTeam={data.allowNoTeam}
        initial={{
          title: "",
          instructions: null,
          teamId: data.allowNoTeam ? null : (data.me.teamId ?? null),
          assigneeMemberId: null,
          locationId: null,
          dueAt: null,
          priority: "normal",
        }}
      />
    </div>
  );
}
