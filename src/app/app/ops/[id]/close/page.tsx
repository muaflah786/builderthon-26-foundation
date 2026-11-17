import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CloseForm } from "@/components/ops/close-form";
import { Alert } from "@/components/ui/alert";
import { isAppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import { getClosePreview } from "@/server/services/ops-closure";

export const metadata: Metadata = { title: "Close operation" };

export default async function CloseOperationPage({ params }: PageProps<"/app/ops/[id]/close">) {
  const user = await requireUser();
  const { id } = await params;

  let preview;
  try {
    preview = await getClosePreview(user, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  if (preview.status !== "live") redirect(`/app/ops/${id}/summary`);
  const { terms } = preview.config;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Close {preview.name}?</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          When it&apos;s closed, nobody can join or change anything. All records are kept, and you
          get a summary you can print or download.
        </p>
      </div>

      {preview.openTasks === 0 && preview.openIssues === 0 ? (
        <Alert variant="success">Everything is finished. You&apos;re ready to close.</Alert>
      ) : (
        <Alert variant="warning" title="Still open">
          {preview.openTasks} unfinished {terms.tasks.toLowerCase()} · {preview.openIssues} open{" "}
          {terms.issues.toLowerCase()}
        </Alert>
      )}

      <CloseForm operationId={preview.id} openTasks={preview.openTasks} tasksWord={terms.tasks} />

      <Link href={`/app/ops/${preview.id}`} className="text-muted-foreground text-sm underline">
        Not yet, go back
      </Link>
    </div>
  );
}
