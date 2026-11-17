import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskButtons } from "@/components/ops/actions";
import { StatePill } from "@/components/ops/state-pill";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { isAppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import { getTask } from "@/server/services/ops-tasks";

export const metadata: Metadata = { title: "Task" };

function when(d: Date | null) {
  return d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;
}

/** Task details: facts, the one next action, and the full history. */
export default async function TaskPage({ params }: PageProps<"/app/ops/[id]/tasks/[taskId]">) {
  const user = await requireUser();
  const { id, taskId } = await params;

  let data;
  try {
    data = await getTask(user, id, taskId);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { task, operation } = data;
  const { terms } = operation.config;
  const back = data.canViewList ? `/app/ops/${operation.id}/tasks` : `/app/ops/${operation.id}`;
  const facts: Array<[string, string | null]> = [
    [terms.team, task.teamName ?? `No ${terms.team.toLowerCase()}`],
    [
      "Person",
      task.assigneeName ??
        (task.status === "todo" ? `Anyone in the ${terms.team.toLowerCase()}` : null),
    ],
    [terms.location, task.locationName],
    ["Due by", when(task.dueAt)],
    ["Created by", task.createdByName ?? "Initial setup"],
    [
      "Completed",
      task.completedAt
        ? `${when(task.completedAt)}${task.completedByName ? ` by ${task.completedByName}` : ""}`
        : null,
    ],
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href={back} className="text-muted-foreground text-sm underline">
          {data.canViewList ? `All ${terms.tasks.toLowerCase()}` : "Back"}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatePill status={task.status} late={task.late} />
          {task.priority === "high" ? <Badge variant="warning">Important</Badge> : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
        {task.instructions ? <p className="whitespace-pre-line">{task.instructions}</p> : null}
        {task.completionNote ? (
          <p className="bg-muted rounded-md p-3 text-sm">
            <span className="font-medium">Note when completed:</span> {task.completionNote}
          </p>
        ) : null}
      </div>

      <dl className="divide-border border-border grid divide-y rounded-lg border text-sm">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 p-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
      </dl>

      {data.canStart || data.canFinish || data.canEdit ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {data.canStart || data.canFinish ? (
            <div className="flex-1">
              <TaskButtons
                operationId={operation.id}
                taskId={task.id}
                status={task.status}
                mine={task.assigneeMemberId === data.me.id || data.canFinish}
                taskWord={terms.task}
              />
            </div>
          ) : null}
          {data.canEdit ? (
            <Link
              href={`/app/ops/${operation.id}/tasks/${task.id}/edit`}
              className={buttonClasses({ variant: "secondary" })}
            >
              Edit or reassign
            </Link>
          ) : null}
        </div>
      ) : operation.status !== "live" ? (
        <p className="text-muted-foreground text-sm">
          This operation is closed. Nothing can be changed.
        </p>
      ) : null}

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="text-lg font-semibold">
          History
        </h2>
        {data.history.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Created in the initial setup. Nothing has happened yet.
          </p>
        ) : (
          <ol className="border-border flex flex-col gap-3 border-l pl-4 text-sm">
            {data.history.map((h) => (
              <li key={h.id}>
                <p>{h.summary}</p>
                <p className="text-muted-foreground text-xs">{when(h.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
