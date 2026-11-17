import Link from "next/link";
import { AutoRefresh, IssueButtons, ReportProblem, TaskButtons } from "@/components/ops/actions";
import { LocationPanel } from "@/components/ops/location-panel";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { withArticle } from "@/lib/ops/terms";
import type { getFieldView, TaskView } from "@/server/services/ops";

type FieldData = Awaited<ReturnType<typeof getFieldView>>;

function time(d: Date | null) {
  return d ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : null;
}

function TaskCard({ task, data, mine }: { task: TaskView; data: FieldData; mine: boolean }) {
  const { terms } = data.operation.config;
  const late = task.dueAt && task.dueAt < new Date() && task.status !== "done";
  return (
    <li className="border-border flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          href={`/app/ops/${data.operation.id}/tasks/${task.id}`}
          className="font-medium hover:underline"
        >
          {task.title}
        </Link>
        <div className="flex gap-1">
          {task.priority === "high" ? <Badge variant="warning">Important</Badge> : null}
          {task.status === "in_progress" ? <Badge variant="primary">In progress</Badge> : null}
          {late ? <Badge variant="danger">Late</Badge> : null}
        </div>
      </div>
      <p className="text-muted-foreground text-sm">
        {task.locationName ? `${terms.location}: ${task.locationName}` : null}
        {task.locationName && task.dueAt ? " · " : null}
        {task.dueAt ? `By ${time(task.dueAt)}` : null}
      </p>
      {task.instructions ? <p className="text-sm">{task.instructions}</p> : null}
      {data.operation.status === "live" ? (
        <TaskButtons
          operationId={data.operation.id}
          taskId={task.id}
          status={task.status}
          mine={mine}
          taskWord={terms.task}
        />
      ) : null}
    </li>
  );
}

/** Mobile-first field screen: what to do now, my tasks, my team, help. */
export function FieldView({ data }: { data: FieldData }) {
  const { config } = data.operation;
  const { terms } = config;
  const now = data.activeTasks[0] ?? data.availableTasks[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <AutoRefresh seconds={30} />
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">{data.operation.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hi {data.member.displayName}</h1>
        <p className="text-sm">
          You are <strong>{config.roleLabels[data.member.level]}</strong>
          {data.team ? (
            <>
              {" "}
              in <strong>{data.team.name}</strong>
            </>
          ) : null}
          {data.team?.locationName ? (
            <>
              {" "}
              · Go to <strong>{data.team.locationName}</strong>
            </>
          ) : null}
        </p>
        {data.team?.directions ? (
          <p className="text-muted-foreground text-sm">{data.team.directions}</p>
        ) : null}
        {data.member.level === "lead" ? (
          <Link
            href={`/app/ops/${data.operation.id}/tasks`}
            className="text-brand text-sm underline"
          >
            All {terms.tasks.toLowerCase()} in your {terms.team.toLowerCase()}
          </Link>
        ) : null}
        {data.canCommand ? (
          <Link href={`/app/ops/${data.operation.id}`} className="text-brand text-sm underline">
            Back to the command centre
          </Link>
        ) : null}
      </header>

      {data.operation.status !== "live" ? (
        <p className="bg-muted rounded-lg p-4 text-sm">
          This operation is closed. Thank you for your help.
        </p>
      ) : null}

      <section aria-labelledby="now" className="bg-muted rounded-lg p-4">
        <h2
          id="now"
          className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
        >
          Right now
        </h2>
        {now ? (
          <p className="mt-1 text-lg font-semibold">
            {data.activeTasks[0] ? "Finish: " : "Next: "}
            {now.title}
            {now.dueAt ? (
              <span className="text-muted-foreground text-base font-normal">
                {" "}
                by {time(now.dueAt)}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-1">
            Nothing for you right now. Stay near{" "}
            {data.team?.locationName ?? `your ${terms.team.toLowerCase()}`}; new{" "}
            {terms.tasks.toLowerCase()} will appear here.
          </p>
        )}
      </section>

      {data.operation.status === "live" ? (
        <ReportProblem
          operationId={data.operation.id}
          issueWord={terms.issue.toLowerCase()}
          categories={config.issueCategories}
          locations={data.locations}
          locationWord={terms.location.toLowerCase()}
        />
      ) : null}

      {data.teamIssues.length > 0 ? (
        <section aria-labelledby="team-issues" className="flex flex-col gap-3">
          <h2 id="team-issues" className="text-lg font-semibold">
            {terms.issues} in your {terms.team.toLowerCase()}
          </h2>
          <ul className="flex flex-col gap-2">
            {data.teamIssues.map((i) => (
              <li
                key={i.id}
                className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-sm ${i.severity === "urgent" ? "border-danger" : "border-border"}`}
              >
                <p className="font-medium">
                  {i.severity === "urgent" ? (
                    <Badge variant="danger" className="mr-2">
                      Urgent
                    </Badge>
                  ) : null}
                  {i.title}
                </p>
                <p className="text-muted-foreground text-sm">
                  {i.reporter ? `From ${i.reporter}` : null}
                  {i.status === "acknowledged" ? " · being handled" : ""}
                </p>
                {data.operation.status === "live" ? (
                  <IssueButtons operationId={data.operation.id} issueId={i.id} status={i.status} />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="my-tasks" className="flex flex-col gap-3">
        <h2 id="my-tasks" className="text-lg font-semibold">
          My {terms.tasks}
        </h2>
        {data.activeTasks.length === 0 && data.availableTasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No {terms.tasks.toLowerCase()} yet
            {data.team ? "" : `. You haven't been put in a ${terms.team.toLowerCase()} yet`}.
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {data.activeTasks.map((t) => (
            <TaskCard key={t.id} task={t} data={data} mine />
          ))}
        </ul>
        {data.availableTasks.length > 0 ? (
          <>
            <h3 className="text-muted-foreground text-sm font-medium">
              Waiting for someone. Press Start to take one.
            </h3>
            <ul className="flex flex-col gap-3">
              {data.availableTasks.map((t) => (
                <TaskCard key={t.id} task={t} data={data} mine={false} />
              ))}
            </ul>
          </>
        ) : null}
        {data.doneTasks.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            You have completed {data.doneTasks.length}. Thank you.
          </p>
        ) : null}
      </section>

      <LocationPanel
        operationId={data.operation.id}
        title={`Where my ${terms.team.toLowerCase()} is`}
        canShare={data.operation.status === "live"}
      />

      <section aria-labelledby="my-team" className="flex flex-col gap-2">
        <h2 id="my-team" className="text-lg font-semibold">
          My {terms.team}
        </h2>
        {data.team ? (
          <>
            <p className="text-sm">
              <strong>{data.team.name}</strong>
              {data.team.purpose ? ` · ${data.team.purpose}` : ""}
            </p>
            <ul className="text-sm">
              {data.teammates.map((m) => (
                <li key={m.id}>
                  {m.name}{" "}
                  <span className="text-muted-foreground">({config.roleLabels[m.level]})</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Not in a {terms.team.toLowerCase()} yet.</p>
        )}
        <div className="border-border bg-background mt-2 rounded-2xl border p-4 text-sm shadow-sm">
          <p className="font-medium">Need help?</p>
          <p className="text-muted-foreground">
            Ask{" "}
            {data.coordinators.map((c) => `${c.name} (${config.roleLabels[c.level]})`).join(", ") ||
              "your organizer"}
            , or use “Report {withArticle(terms.issue.toLowerCase())}” above.
          </p>
        </div>
      </section>

      {data.myIssues.length > 0 ? (
        <section aria-labelledby="my-reports" className="flex flex-col gap-2">
          <h2 id="my-reports" className="text-lg font-semibold">
            {terms.issues} I reported
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {data.myIssues.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span>{i.title}</span>
                <Badge
                  variant={
                    i.status === "resolved"
                      ? "success"
                      : i.status === "acknowledged"
                        ? "primary"
                        : "warning"
                  }
                >
                  {i.status === "resolved"
                    ? "Resolved"
                    : i.status === "acknowledged"
                      ? "Someone is on it"
                      : "Sent"}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link href="/app" className={buttonClasses({ variant: "ghost", size: "sm" })}>
        All my operations
      </Link>
    </div>
  );
}
