import { Badge, type BadgeVariant } from "@/components/ui/badge";

const STATES: Record<string, { label: string; variant: BadgeVariant }> = {
  todo: { label: "Waiting", variant: "neutral" },
  in_progress: { label: "In progress", variant: "primary" },
  blocked: { label: "Stuck", variant: "warning" },
  done: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

/** Task state in plain words. Same everywhere a task appears. */
export function StatePill({ status, late }: { status: string; late?: boolean }) {
  const s = STATES[status] ?? { label: status, variant: "neutral" as const };
  return (
    <span className="inline-flex gap-1">
      <Badge variant={s.variant}>{s.label}</Badge>
      {late ? <Badge variant="danger">Late</Badge> : null}
    </span>
  );
}
