import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ops/print-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { isAppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import { getSummary } from "@/server/services/ops-closure";

export const metadata: Metadata = { title: "Summary" };

function when(d: Date | null) {
  return d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";
}

function minutes(m: number | null) {
  if (m === null) return "not available yet";
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** Operation summary: computed from the records, never estimated. */
export default async function SummaryPage({
  params,
  searchParams,
}: PageProps<"/app/ops/[id]/summary">) {
  const user = await requireUser();
  const { id } = await params;
  const { closed } = await searchParams;

  let s;
  try {
    s = await getSummary(user, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { terms } = s.operation.config;
  const isClosed = s.operation.status === "closed";
  const exportHref = (type: string) => `/api/ops/${s.operation.id}/export?type=${type}`;

  return (
    <div className="flex flex-col gap-8">
      {closed ? (
        <Alert variant="success" title="Operation closed">
          Nothing can be changed now. Every record is kept below.
        </Alert>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            Summary ·{" "}
            <Badge variant={isClosed ? "neutral" : "success"}>
              {isClosed ? "Closed" : "Still live"}
            </Badge>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{s.operation.name}</h1>
          <p className="text-muted-foreground text-sm">
            Launched {when(s.operation.createdAt)}
            {s.operation.closedAt ? ` · closed ${when(s.operation.closedAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton />
          {s.canClose ? (
            <Link
              href={`/app/ops/${s.operation.id}/close`}
              className={buttonClasses({ variant: "danger" })}
            >
              Close operation
            </Link>
          ) : null}
          <Link href={`/app/ops/${s.operation.id}`} className={buttonClasses({ variant: "ghost" })}>
            {isClosed ? "Back" : "Back to the command centre"}
          </Link>
        </div>
      </header>

      {!isClosed ? (
        <p className="text-muted-foreground text-sm">
          This is a live snapshot. The numbers keep changing until the operation is closed.
        </p>
      ) : null}

      <section
        aria-labelledby="totals"
        className="border-border bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4"
      >
        <h2 id="totals" className="sr-only">
          Totals
        </h2>
        {[
          {
            label: `${terms.tasks} completed`,
            value: `${s.tasks.done} / ${s.tasks.total}`,
            note: `${s.tasks.completion}%`,
          },
          { label: "Completed after due time", value: s.tasks.doneLate },
          {
            label: `${terms.issues} reported`,
            value: s.issues.total,
            note: `${s.issues.urgent} urgent · ${s.issues.resolved} resolved`,
          },
          { label: "People who joined", value: s.people },
        ].map((x) => (
          <div key={x.label} className="bg-background p-4">
            <p className="text-muted-foreground text-sm">{x.label}</p>
            <p className="text-2xl font-semibold tabular-nums">{x.value}</p>
            {x.note ? <p className="text-muted-foreground text-xs">{x.note}</p> : null}
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="by-team" className="flex flex-col gap-2">
          <h2 id="by-team" className="text-lg font-semibold">
            By {terms.team.toLowerCase()}
          </h2>
          <ul className="divide-border border-border divide-y rounded-lg border text-sm">
            {s.teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 p-3">
                <span>
                  <span className="font-medium">{t.name}</span>{" "}
                  <span className="text-muted-foreground">· {t.people} joined</span>
                </span>
                <span className="tabular-nums">
                  {t.done}/{t.total}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="problems" className="flex flex-col gap-2">
          <h2 id="problems" className="text-lg font-semibold">
            {terms.issues}
          </h2>
          <p className="text-sm">
            Typical time until someone responded:{" "}
            <strong>{minutes(s.issues.medianResponseMinutes)}</strong>
            <br />
            Typical time to resolve: <strong>{minutes(s.issues.medianResolveMinutes)}</strong>
          </p>
          {s.issues.unresolved.length > 0 ? (
            <>
              <h3 className="text-muted-foreground text-sm font-medium">Not resolved</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {s.issues.unresolved.map((i) => (
                  <li key={i.id}>
                    {i.severity === "urgent" ? (
                      <Badge variant="danger" className="mr-2">
                        Urgent
                      </Badge>
                    ) : null}
                    {i.title}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              {s.issues.total === 0
                ? `No ${terms.issues.toLowerCase()} were reported.`
                : `Every reported ${terms.issue.toLowerCase()} was resolved.`}
            </p>
          )}
        </section>
      </div>

      {s.tasks.unfinishedList.length > 0 ? (
        <section aria-labelledby="unfinished" className="flex flex-col gap-2">
          <h2 id="unfinished" className="text-lg font-semibold">
            Unfinished {terms.tasks.toLowerCase()} ({s.tasks.unfinished})
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {s.tasks.unfinishedList.map((t) => (
              <li key={t.id}>
                {t.title}{" "}
                <span className="text-muted-foreground">
                  ·{" "}
                  {t.status === "in_progress"
                    ? `started by ${t.assigneeName ?? "someone"}`
                    : "not started"}
                  {t.late ? " · past due" : ""}
                </span>
              </li>
            ))}
          </ul>
          {s.tasks.unfinished > s.tasks.unfinishedList.length ? (
            <p className="text-muted-foreground text-sm">The full list is in the download below.</p>
          ) : null}
        </section>
      ) : null}

      {s.canExport ? (
        <section aria-labelledby="downloads" className="flex flex-col gap-2 print:hidden">
          <h2 id="downloads" className="text-lg font-semibold">
            Download records (CSV)
          </h2>
          <div className="flex flex-wrap gap-2">
            <a className={buttonClasses({ variant: "secondary" })} href={exportHref("tasks")}>
              {terms.tasks}
            </a>
            <a className={buttonClasses({ variant: "secondary" })} href={exportHref("issues")}>
              {terms.issues}
            </a>
            <a className={buttonClasses({ variant: "secondary" })} href={exportHref("activity")}>
              Full history
            </a>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="timeline" className="flex flex-col gap-2">
        <h2 id="timeline" className="text-lg font-semibold">
          Timeline
        </h2>
        <ol className="flex flex-col gap-1 text-sm">
          {s.timeline.map((a) => (
            <li key={a.id} className="flex gap-3">
              <span className="text-muted-foreground w-40 shrink-0 tabular-nums">
                {when(a.createdAt)}
              </span>
              <span>{a.summary}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
