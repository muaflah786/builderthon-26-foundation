"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import type { FieldErrors } from "@/lib/errors";
import type { OpsTerms } from "@/lib/ops/types";

type Option = { id: string; name: string };
type Person = Option & { teamId: string | null };

export type TaskFormValues = {
  id?: string;
  version?: number;
  title: string;
  instructions: string | null;
  teamId: string | null;
  assigneeMemberId: string | null;
  locationId: string | null;
  dueAt: string | null;
  priority: "normal" | "high";
};

/** ISO → value for <input type="datetime-local"> in the viewer's time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Create or edit a task. Pickers only offer what this person may assign. */
export function TaskForm({
  operationId,
  terms,
  teams,
  people,
  locations,
  allowNoTeam,
  initial,
}: {
  operationId: string;
  terms: OpsTerms;
  teams: Option[];
  people: Person[];
  locations: Option[];
  allowNoTeam: boolean;
  initial: TaskFormValues;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const editing = Boolean(initial.id);
  const [teamId, setTeamId] = useState(initial.teamId ?? (allowNoTeam ? "" : (teams[0]?.id ?? "")));
  const [assignee, setAssignee] = useState(initial.assigneeMemberId ?? "");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // People shown for the chosen team; anyone when no team is chosen.
  const peopleForTeam = useMemo(
    () => (teamId ? people.filter((p) => p.teamId === teamId) : people),
    [people, teamId],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = {
      title: data.get("title"),
      instructions: data.get("instructions"),
      teamId: teamId || null,
      assigneeMemberId: assignee || null,
      locationId: data.get("locationId") || null,
      dueAt: fromLocalInput(String(data.get("dueAt") ?? "")),
      priority: data.get("important") ? "high" : "normal",
      ...(editing ? { expectedVersion: initial.version } : {}),
    };
    setPending(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const task = await apiFetch<{ id: string }>(
        editing ? `/api/ops/${operationId}/tasks/${initial.id}` : `/api/ops/${operationId}/tasks`,
        { method: editing ? "PATCH" : "POST", body },
      );
      toast({
        variant: "success",
        title: editing ? `${terms.task} saved` : `${terms.task} created`,
      });
      router.push(`/app/ops/${operationId}/tasks/${task.id}`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setFieldErrors(e.fieldErrors ?? {});
        setFormError(e.fieldErrors ? "Please check the highlighted fields." : e.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setPending(false);
    }
  }

  const err = (name: string) => fieldErrors[name]?.[0];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormError message={formError} />

      <div className="flex flex-col gap-1">
        <Label htmlFor="title">What needs to be done?</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initial.title}
          required
          maxLength={160}
          aria-invalid={Boolean(err("title"))}
          aria-describedby={err("title") ? "title-error" : undefined}
          autoFocus={!editing}
        />
        {err("title") ? (
          <p id="title-error" className="text-danger text-sm">
            {err("title")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="instructions">Instructions (optional)</Label>
        <Textarea
          id="instructions"
          name="instructions"
          rows={3}
          maxLength={1000}
          defaultValue={initial.instructions ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="teamId">{terms.team}</Label>
          <Select
            id="teamId"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              // Keep the person only if they belong to the new team.
              if (
                e.target.value &&
                !people.some((p) => p.id === assignee && p.teamId === e.target.value)
              ) {
                setAssignee("");
              }
            }}
          >
            {allowNoTeam ? <option value="">No {terms.team.toLowerCase()}</option> : null}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          {err("teamId") ? <p className="text-danger text-sm">{err("teamId")}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="assigneeMemberId">Person</Label>
          <Select
            id="assigneeMemberId"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">
              {teamId ? `Anyone in the ${terms.team.toLowerCase()}` : "Nobody yet"}
            </option>
            {peopleForTeam.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {err("assigneeMemberId") ? (
            <p className="text-danger text-sm">{err("assigneeMemberId")}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="locationId">{terms.location} (optional)</Label>
          <Select id="locationId" name="locationId" defaultValue={initial.locationId ?? ""}>
            <option value="">Not set</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dueAt">Due by (optional)</Label>
          <Input
            id="dueAt"
            name="dueAt"
            type="datetime-local"
            defaultValue={toLocalInput(initial.dueAt)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox name="important" defaultChecked={initial.priority === "high"} />
        Important (shown first, marked for everyone)
      </label>

      {editing && initial.assigneeMemberId ? (
        <p className="text-muted-foreground text-sm">
          If you change the person, the {terms.task.toLowerCase()} goes back to waiting so the new
          person can start it.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" loading={pending}>
          {editing ? "Save changes" : `Create ${terms.task.toLowerCase()}`}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
