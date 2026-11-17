import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/ops/actions";
import { StatePill } from "@/components/ops/state-pill";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { pageMeta } from "@/lib/validation/common";
import { listTasksQuerySchema, TASK_FILTERS } from "@/lib/validation/ops";
import { isAppError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { listTasks } from "@/server/services/ops-tasks";

export const metadata: Metadata = { title: "Tasks" };

function time(d: Date | null) {
  return d
    ? d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
}

/** Task overview: everything (coordinators+) or the lead's own team. */
export default async function TasksPage({
  params,
  searchParams,
}: PageProps<"/app/ops/[id]/tasks">) {
  const user = await requireUser();
  const { id } = await params;
  const raw = await searchParams;
  const parsed = listTasksQuerySchema.safeParse({
    state: raw.state,
    teamId: raw.teamId,
    q: raw.q,
    page: raw.page,
  });
  const query = parsed.success ? parsed.data : listTasksQuerySchema.parse({});

  let data;
  try {
    data = await listTasks(user, id, query);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { terms } = data.operation.config;
  const base = `/app/ops/${data.operation.id}/tasks`;
  const filterLabels: Record<(typeof TASK_FILTERS)[number], string> = {
    all: "All",
    todo: "Waiting",
    in_progress: "In progress",
    late: "Late",
    done: "Completed",
  };
  const href = (state: string) => {
    const p = new URLSearchParams();
    if (state !== "all") p.set("state", state);
    if (query.teamId) p.set("teamId", query.teamId);
    if (query.q) p.set("q", query.q);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const filtered = query.state !== "all" || query.teamId || query.q;

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={30} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{data.operation.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{terms.tasks}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.canCreate ? (
            <Link href={`${base}/new`} className={buttonClasses({ size: "lg" })}>
              New {terms.task.toLowerCase()}
            </Link>
          ) : null}
          <Link
            href={`/app/ops/${data.operation.id}`}
            className={buttonClasses({ variant: "ghost", size: "lg" })}
          >
            Back
          </Link>
        </div>
      </header>

      <nav aria-label="Filter by state" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1">
          {TASK_FILTERS.map((f) => (
            <li key={f}>
              <Link
                href={href(f)}
                aria-current={query.state === f ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  query.state === f
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted",
                  f === "late" && data.counts.late > 0 && query.state !== f ? "text-danger" : "",
                )}
              >
                {filterLabels[f]}
                <span className="tabular-nums opacity-70">{data.counts[f]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form method="get" action={base} className="flex flex-wrap items-end gap-2" role="search">
        {query.state !== "all" ? <input type="hidden" name="state" value={query.state} /> : null}
        {data.teams.length > 1 ? (
          <Select
            name="teamId"
            defaultValue={query.teamId ?? ""}
            aria-label={`Filter by ${terms.team.toLowerCase()}`}
            className="w-auto"
          >
            <option value="">All {terms.teams.toLowerCase()}</option>
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Search by name"
          aria-label="Search"
          className="w-56"
        />
        <Button type="submit" variant="secondary">
          Show
        </Button>
        {filtered ? (
          <Link href={base} className="text-muted-foreground text-sm underline">
            Clear
          </Link>
        ) : null}
      </form>

      {data.rows.length === 0 ? (
        <EmptyState
          title={
            filtered
              ? `No ${terms.tasks.toLowerCase()} match`
              : `No ${terms.tasks.toLowerCase()} yet`
          }
          description={
            filtered
              ? "Try another filter, or clear the filters."
              : `Create the first ${terms.task.toLowerCase()} and choose who should do it.`
          }
          action={
            data.canCreate && !filtered ? (
              <Link href={`${base}/new`} className={buttonClasses()}>
                New {terms.task.toLowerCase()}
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {data.rows.map((t) => (
            <li key={t.id}>
              <Link
                href={`${base}/${t.id}`}
                className="hover:bg-muted flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {t.title}
                    {t.priority === "high" ? (
                      <Badge variant="warning" className="ml-2">
                        Important
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {[
                      t.teamName
                        ? `${t.teamName}${t.teamArchived ? " (removed)" : ""}`
                        : `No ${terms.team.toLowerCase()}`,
                      t.assigneeName ?? (t.status === "todo" ? "nobody yet" : null),
                      t.locationName,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  {t.dueAt ? (
                    <span
                      className={cn(
                        "tabular-nums",
                        t.late ? "text-danger font-medium" : "text-muted-foreground",
                      )}
                    >
                      {time(t.dueAt)}
                    </span>
                  ) : null}
                  <StatePill status={t.status} late={t.late} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.total > data.pageSize ? (
        <Pagination meta={pageMeta(data.total, query.page, data.pageSize)} />
      ) : null}
    </div>
  );
}
