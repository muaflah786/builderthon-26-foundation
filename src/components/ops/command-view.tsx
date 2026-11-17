import Link from "next/link";
import { AutoRefresh, IssueButtons } from "@/components/ops/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { canClose } from "@/lib/ops/permissions";
import type { AttentionSignal } from "@/lib/ops/types";
import type { getCommandView } from "@/server/services/ops";

type CommandData = Awaited<ReturnType<typeof getCommandView>>;

function time(d: Date | null) {
  return d ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";
}

/** Live command centre: problems first, then progress. */
export function CommandView({ data, renderedAt }: { data: CommandData; renderedAt: Date }) {
  const { config } = data.operation;
  const { terms } = config;
  const signalText: Record<AttentionSignal, string> = {
    urgent_issues: `urgent ${terms.issues.toLowerCase()}`,
    delayed_tasks: `late ${terms.tasks.toLowerCase()}`,
    open_issues: `open ${terms.issues.toLowerCase()}`,
    unclaimed_tasks: `${terms.tasks.toLowerCase()} nobody has started`,
  };
  const percent = data.counts.total ? Math.round((data.counts.done / data.counts.total) * 100) : 0;
  const live = data.operation.status === "live";
  const attention = data.attentionOrder.filter((s) => data.attention[s].count > 0);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh seconds={15} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            Command centre · {config.roleLabels[data.member.level]}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{data.operation.name}</h1>
          <p className="text-muted-foreground text-xs">
            Updated {time(renderedAt)} · refreshes every 15 seconds
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {live ? (
            <Link href={`/app/ops/${data.operation.id}/share`} className={buttonClasses()}>
              Invite people
            </Link>
          ) : null}
          <Link
            href={`/app/ops/${data.operation.id}?view=field`}
            className={buttonClasses({ variant: "secondary" })}
          >
            See the field view
          </Link>
          <Link
            href={`/app/ops/${data.operation.id}/people`}
            className={buttonClasses({ variant: "secondary" })}
          >
            People
          </Link>
          <Link
            href={`/app/ops/${data.operation.id}/summary`}
            className={buttonClasses({ variant: "secondary" })}
          >
            Summary
          </Link>
          {live && canClose({ id: data.member.id, level: data.member.level, teamId: null }) ? (
            <Link
              href={`/app/ops/${data.operation.id}/close`}
              className={buttonClasses({ variant: "ghost" })}
            >
              Close operation
            </Link>
          ) : null}
        </div>
      </header>

      {!live ? (
        <p className="bg-muted rounded-lg p-4 text-sm">
          This operation is closed. Nothing can be changed.{" "}
          <Link href={`/app/ops/${data.operation.id}/summary`} className="text-primary underline">
            See the summary
          </Link>
        </p>
      ) : null}

      <section
        aria-labelledby="numbers"
        className="border-border bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4"
      >
        <h2 id="numbers" className="sr-only">
          Progress
        </h2>
        {[
          {
            label: `${terms.tasks} done`,
            value: `${data.counts.done} / ${data.counts.total}`,
            note: `${percent}%`,
          },
          { label: "In progress", value: data.counts.inProgress },
          { label: "Late", value: data.counts.delayed, alert: data.counts.delayed > 0 },
          {
            label: `Open ${terms.issues.toLowerCase()}`,
            value: data.counts.openIssues,
            alert: data.attention.urgent_issues.count > 0,
          },
        ].map((s) => (
          <div key={s.label} className="bg-background p-4">
            <p className="text-muted-foreground text-sm">{s.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${s.alert ? "text-danger" : ""}`}>
              {s.value}
            </p>
            {s.note ? <p className="text-muted-foreground text-xs">{s.note}</p> : null}
          </div>
        ))}
      </section>

      <section aria-labelledby="attention" className="flex flex-col gap-3">
        <h2 id="attention" className="text-lg font-semibold">
          Needs attention
        </h2>
        {attention.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing needs you right now.</p>
        ) : (
          <p className="text-sm">
            {attention.map((s, i) => (
              <span key={s}>
                {i > 0 ? " · " : ""}
                <strong className={s === "urgent_issues" ? "text-danger" : ""}>
                  {data.attention[s].count}
                </strong>{" "}
                {signalText[s]}
              </span>
            ))}
          </p>
        )}

        {data.openIssues.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.openIssues.map((i) => (
              <li
                key={i.id}
                className={`flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${i.severity === "urgent" ? "border-danger" : "border-border"}`}
              >
                <div>
                  <p className="font-medium">
                    {i.severity === "urgent" ? (
                      <Badge variant="danger" className="mr-2">
                        Urgent
                      </Badge>
                    ) : null}
                    {i.title}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {[
                      i.category,
                      i.locationName,
                      i.teamName,
                      i.reporter ? `from ${i.reporter}` : null,
                      time(i.createdAt),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {i.status === "acknowledged" ? " · being handled" : ""}
                  </p>
                  {i.details ? <p className="mt-1 text-sm">{i.details}</p> : null}
                </div>
                {live ? (
                  <IssueButtons operationId={data.operation.id} issueId={i.id} status={i.status} />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {data.delayedTasks.length > 0 ? (
          <div>
            <h3 className="text-muted-foreground text-sm font-medium">
              Late {terms.tasks.toLowerCase()}
            </h3>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {data.delayedTasks.map((t) => (
                <li key={t.id}>
                  <strong>{t.title}</strong>{" "}
                  <span className="text-muted-foreground">
                    · {t.teamName ?? "no team"} · due {time(t.dueAt)} ·{" "}
                    {t.assigneeName ? `with ${t.assigneeName}` : "nobody started it"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="teams" className="flex flex-col gap-3">
          <h2 id="teams" className="text-lg font-semibold">
            {terms.teams}
          </h2>
          <ul className="divide-border border-border divide-y rounded-lg border">
            {data.teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-muted-foreground">
                    {t.people}{" "}
                    {t.people === 1
                      ? terms.participant.toLowerCase()
                      : terms.participants.toLowerCase()}
                    {t.people === 0 ? " · nobody yet" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.delayed > 0 ? <Badge variant="danger">{t.delayed} late</Badge> : null}
                  <span className="tabular-nums">
                    {t.done}/{t.total}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-sm">
            {data.counts.people} {data.counts.people === 1 ? "person has" : "people have"} joined.
          </p>
        </section>

        <section aria-labelledby="activity" className="flex flex-col gap-3">
          <h2 id="activity" className="text-lg font-semibold">
            Recent activity
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {data.activity.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="text-muted-foreground w-16 shrink-0 tabular-nums">
                  {time(a.createdAt)}
                </span>
                <span>{a.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
