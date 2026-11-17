"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/api/client";

/** Confirms closing, with one choice about unfinished tasks. */
export function CloseForm({
  operationId,
  openTasks,
  tasksWord,
}: {
  operationId: string;
  openTasks: number;
  tasksWord: string;
}) {
  const router = useRouter();
  const [unfinished, setUnfinished] = useState<"leave" | "cancel">("leave");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/ops/${operationId}/close`, { method: "POST", body: { unfinished } });
      router.replace(`/app/ops/${operationId}/summary?closed=1`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not close. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {openTasks > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">
            What should happen to the {openTasks} unfinished {tasksWord.toLowerCase()}?
          </legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="unfinished"
              className="mt-1 size-4"
              checked={unfinished === "leave"}
              onChange={() => setUnfinished("leave")}
            />
            <span>
              <strong>Keep them as unfinished</strong>
              <span className="text-muted-foreground block">
                The summary shows them as not done.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="unfinished"
              className="mt-1 size-4"
              checked={unfinished === "cancel"}
              onChange={() => setUnfinished("cancel")}
            />
            <span>
              <strong>Mark them as cancelled</strong>
              <span className="text-muted-foreground block">
                Use this if they were no longer needed. They don&apos;t count against completion.
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}
      <div>
        <Button variant="danger" size="lg" onClick={close} loading={pending}>
          Close operation
        </Button>
      </div>
    </div>
  );
}
