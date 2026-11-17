import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh, IssueButtons } from "@/components/ops/actions";
import { Icon } from "@/components/ops/icons";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { isAppError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { listIssues } from "@/server/services/ops-issues";

export const metadata: Metadata = { title: "Issues" };

function ago(d: Date) {
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

const FILTERS = ["all", "open", "acknowledged", "resolved"] as const;

/** Issue & incident management: real reports, newest first, with respond/resolve actions. */
export default async function IssuesPage({
  params,
  searchParams,
}: PageProps<"/app/ops/[id]/issues">) {
  const user = await requireUser();
  const { id } = await params;
  const { status } = await searchParams;
  const filter = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";

  let data;
  try {
    data = await listIssues(user, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { terms } = data.operation.config;
  const live = data.operation.status === "live";
  const base = `/app/ops/${data.operation.id}/issues`;
  const shown = filter === "all" ? data.issues : data.issues.filter((i) => i.status === filter);
  const labels = { all: "All", open: "Open", acknowledged: "In progress", resolved: "Resolved" };
  const count = {
    all: data.counts.all,
    open: data.counts.open,
    acknowledged: data.counts.acknowledged,
    resolved: data.counts.resolved,
  };

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={15} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.3em] uppercase">
            {data.operation.name} · {terms.issue} management
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Track &amp; resolve <span className="text-brand">{terms.issues}.</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Every report from the field, newest first. Respond, resolve and keep everyone safe.
          </p>
        </div>
        <Link
          href={`/app/ops/${data.operation.id}`}
          className={buttonClasses({ variant: "ghost", size: "lg" })}
        >
          Back
        </Link>
      </header>

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: `Open ${terms.issues.toLowerCase()}`,
            value: data.counts.open + data.counts.acknowledged,
            icon: "alert" as const,
          },
          { label: "Resolved", value: data.counts.resolved, icon: "check" as const },
          {
            label: "Urgent, not resolved",
            value: data.counts.urgentOpen,
            icon: "siren" as const,
            alert: data.counts.urgentOpen > 0,
          },
          {
            label: "Typical time to resolve",
            value: data.medianResolveMinutes === null ? "—" : `${data.medianResolveMinutes} min`,
            icon: "calendar" as const,
          },
        ].map((c) => (
          <div
            key={c.label}
            className="border-border bg-background flex items-center gap-4 rounded-2xl border p-4 shadow-sm"
          >
            <span
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-full",
                c.alert ? "bg-danger/10 text-danger" : "bg-brand-soft text-brand",
              )}
            >
              <Icon name={c.icon} className="size-6" />
            </span>
            <span>
              <span
                className={cn(
                  "block text-2xl font-extrabold tabular-nums",
                  c.alert && "text-danger",
                )}
              >
                {c.value}
              </span>
              <span className="text-muted-foreground text-sm">{c.label}</span>
            </span>
          </div>
        ))}
      </section>

      <nav aria-label="Filter" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1">
          {FILTERS.map((f) => (
            <li key={f}>
              <Link
                href={f === "all" ? base : `${base}?status=${f}`}
                aria-current={filter === f ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  filter === f
                    ? "border-brand bg-brand-soft font-semibold"
                    : "border-border hover:bg-muted",
                )}
              >
                {labels[f]} <span className="tabular-nums opacity-70">{count[f]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {shown.length === 0 ? (
        <div className="border-border bg-background rounded-2xl border p-8 text-center shadow-sm">
          <p className="font-semibold">No {terms.issues.toLowerCase()} here</p>
          <p className="text-muted-foreground text-sm">
            When someone taps &ldquo;Report a {terms.issue.toLowerCase()}&rdquo; in the field, it
            appears here instantly.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((i) => (
            <li
              key={i.id}
              className={cn(
                "bg-background flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
                i.severity === "urgent" && i.status !== "resolved"
                  ? "border-brand"
                  : "border-border",
              )}
            >
              <div className="flex gap-3">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full",
                    i.status === "resolved"
                      ? "bg-success/10 text-success"
                      : i.severity === "urgent"
                        ? "bg-danger/10 text-danger"
                        : "bg-brand-soft text-brand",
                  )}
                >
                  <Icon name={i.status === "resolved" ? "check" : "alert"} className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {[
                      i.locationName,
                      i.teamName,
                      i.category,
                      i.reporter ? `from ${i.reporter}` : null,
                      ago(i.createdAt),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {i.details ? <p className="mt-1 text-sm">{i.details}</p> : null}
                  {i.resolutionNote ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      Resolution: {i.resolutionNote}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {i.severity === "urgent" ? (
                  <Badge variant="danger">Urgent</Badge>
                ) : (
                  <Badge>Normal</Badge>
                )}
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
                      ? "In progress"
                      : "Open"}
                </Badge>
                {live && i.status !== "resolved" ? (
                  <IssueButtons operationId={data.operation.id} issueId={i.id} status={i.status} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
