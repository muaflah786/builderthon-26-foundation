import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PeopleManager } from "@/components/ops/people-manager";
import { AutoRefresh } from "@/components/ops/actions";
import { buttonClasses } from "@/components/ui/button";
import { isAppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import { getPeople } from "@/server/services/ops-people";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage({ params }: PageProps<"/app/ops/[id]/people">) {
  const user = await requireUser();
  const { id } = await params;

  let data;
  try {
    data = await getPeople(user, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { config } = data.operation;
  const readOnly = data.operation.status !== "live";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <AutoRefresh seconds={30} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{data.operation.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">People and roles</h1>
          <p className="text-muted-foreground text-sm">
            Put people in a {config.terms.team.toLowerCase()} and give them a role. Changes save
            straight away and people see them on their next refresh.
          </p>
        </div>
        <Link
          href={`/app/ops/${data.operation.id}`}
          className={buttonClasses({ variant: "ghost" })}
        >
          Back to the command centre
        </Link>
      </header>
      {readOnly ? (
        <p className="bg-muted rounded-lg p-4 text-sm">
          This operation is closed. Nothing can be changed.
        </p>
      ) : null}
      <PeopleManager
        operationId={data.operation.id}
        me={data.me}
        people={data.members}
        teams={data.teams}
        labels={config.roleLabels}
        teamWord={config.terms.team}
        readOnly={readOnly}
      />
    </div>
  );
}
