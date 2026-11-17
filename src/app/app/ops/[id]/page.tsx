import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommandView } from "@/components/ops/command-view";
import { FieldView } from "@/components/ops/field-view";
import { isAppError } from "@/lib/errors";
import { canViewCommand } from "@/lib/ops/permissions";
import { requireUser } from "@/server/auth/session";
import { getCommandView, getFieldView, requireMember } from "@/server/services/ops";
import type { SessionUser } from "@/types/auth";

export const metadata: Metadata = { title: "Operation" };

async function load(user: SessionUser, id: string, view: unknown) {
  const { member } = await requireMember(user, id);
  const command = canViewCommand({ id: member.id, level: member.level, teamId: member.teamId });
  if (command && view !== "field")
    return { kind: "command" as const, data: await getCommandView(user, id) };
  return { kind: "field" as const, data: await getFieldView(user, id) };
}

/** Role-aware home: coordinators+ land on the command centre, everyone else on the field view. */
export default async function OperationPage({ params, searchParams }: PageProps<"/app/ops/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { view } = await searchParams;

  let result: Awaited<ReturnType<typeof load>>;
  try {
    result = await load(user, id, view);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  return result.kind === "command" ? (
    <CommandView data={result.data} renderedAt={new Date()} />
  ) : (
    <FieldView data={result.data} />
  );
}
