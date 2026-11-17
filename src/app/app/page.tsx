import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/session";
import { listMyOperations } from "@/server/services/ops";

export const metadata: Metadata = { title: "Your operations" };

/** Signed-in home: the operations you belong to, and one clear way to start a new one. */
export default async function AppHomePage() {
  const user = await requireUser();
  const ops = await listMyOperations(user);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your operations</h1>
          <p className="text-muted-foreground text-sm">
            Hello {user.name}. Pick one, or start a new one.
          </p>
        </div>
        <Link href="/app/ops/new" className={buttonClasses({ size: "lg" })}>
          Start a new operation
        </Link>
      </div>

      {ops.length === 0 ? (
        <EmptyState
          title="No operations yet"
          description="Describe what's happening and we'll set up teams, places and tasks for you. If someone sent you a link or QR code, open it to join their operation."
          action={
            <Link href="/app/ops/new" className={buttonClasses()}>
              Start a new operation
            </Link>
          }
        />
      ) : (
        <ul className="divide-border border-border bg-background divide-y rounded-2xl border shadow-sm">
          {ops.map((op) => (
            <li key={op.id}>
              <Link
                href={`/app/ops/${op.id}`}
                className="hover:bg-muted flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-medium">{op.name}</p>
                  <p className="text-muted-foreground text-sm">
                    You are: {op.config.roleLabels[op.level]}
                    {op.startsAt
                      ? ` · starts ${op.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                      : ""}
                  </p>
                </div>
                <Badge variant={op.status === "live" ? "success" : "neutral"}>
                  {op.status === "live" ? "Live" : "Closed"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
