"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { canSetLevel, canSetTeam, type MemberRef } from "@/lib/ops/permissions";
import { PERMISSION_LEVELS, type PermissionLevel, type RoleLabels } from "@/lib/ops/types";

type Person = { id: string; displayName: string; level: PermissionLevel; teamId: string | null };

const LEVEL_HELP: Record<PermissionLevel, string> = {
  organizer: "Runs everything, can close the operation",
  coordinator: "Sees everything, handles problems, manages people",
  lead: "Leads one team, handles that team's problems",
  member: "Does the tasks",
};

function errorText(e: unknown) {
  return e instanceof ApiClientError ? e.message : "Something went wrong. Please try again.";
}

/** One row per person: team and role change instantly, with a toast. */
function PersonRow({
  operationId,
  person,
  me,
  teams,
  labels,
  teamWord,
  readOnly,
}: {
  operationId: string;
  person: Person;
  me: MemberRef;
  teams: Array<{ id: string; name: string }>;
  labels: RoleLabels;
  teamWord: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const target = { id: person.id, level: person.level };
  const allowedLevels = PERMISSION_LEVELS.filter(
    (l) => l === person.level || canSetLevel(me, target, l),
  );
  const levelLocked = readOnly || allowedLevels.length <= 1;
  const teamLocked = readOnly || !canSetTeam(me, target);

  async function save(body: { teamId?: string | null; level?: PermissionLevel }, done: string) {
    setPending(true);
    try {
      await apiFetch(`/api/ops/${operationId}/members/${person.id}`, { method: "PATCH", body });
      toast({ variant: "success", title: done });
    } catch (e) {
      toast({ variant: "danger", title: errorText(e) });
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-medium">
        {person.displayName}
        {person.id === me.id ? (
          <span className="text-muted-foreground font-normal"> (you)</span>
        ) : null}
      </p>
      <div className="grid gap-2 sm:w-[28rem] sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`team-${person.id}`} className="text-muted-foreground text-xs">
            {teamWord}
          </Label>
          <Select
            id={`team-${person.id}`}
            aria-label={`${teamWord} for ${person.displayName}`}
            value={person.teamId ?? ""}
            disabled={teamLocked || pending}
            onChange={(e) =>
              save(
                { teamId: e.target.value || null },
                `${person.displayName} moved to ${teams.find((t) => t.id === e.target.value)?.name ?? `no ${teamWord.toLowerCase()}`}`,
              )
            }
          >
            <option value="">No {teamWord.toLowerCase()} yet</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`level-${person.id}`} className="text-muted-foreground text-xs">
            Role
          </Label>
          <Select
            id={`level-${person.id}`}
            aria-label={`Role for ${person.displayName}`}
            value={person.level}
            disabled={levelLocked || pending}
            onChange={(e) => {
              const level = e.target.value as PermissionLevel;
              save({ level }, `${person.displayName} is now ${labels[level]}`);
            }}
          >
            {allowedLevels.map((l) => (
              <option key={l} value={l}>
                {labels[l]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </li>
  );
}

/** Organizer-only form to rename the four roles. Labels never change access. */
function RoleLabelsForm({ operationId, labels }: { operationId: string; labels: RoleLabels }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = Object.fromEntries(PERMISSION_LEVELS.map((l) => [l, String(data.get(l) ?? "")]));
    setPending(true);
    try {
      await apiFetch(`/api/ops/${operationId}/role-labels`, { method: "PATCH", body });
      toast({ variant: "success", title: "Role names saved. Everyone sees them now." });
      router.refresh();
    } catch (e) {
      toast({ variant: "danger", title: errorText(e) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        {PERMISSION_LEVELS.map((l) => (
          <div key={l} className="flex flex-col gap-1">
            <Label htmlFor={`label-${l}`}>{LEVEL_HELP[l]}</Label>
            <Input id={`label-${l}`} name={l} defaultValue={labels[l]} required maxLength={40} />
          </div>
        ))}
      </div>
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          Save role names
        </Button>
      </div>
    </form>
  );
}

export function PeopleManager({
  operationId,
  me,
  people,
  teams,
  labels,
  teamWord,
  readOnly,
}: {
  operationId: string;
  me: MemberRef;
  people: Person[];
  teams: Array<{ id: string; name: string }>;
  labels: RoleLabels;
  teamWord: string;
  readOnly: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="people" className="flex flex-col gap-3">
        <h2 id="people" className="text-lg font-semibold">
          Everyone ({people.length})
        </h2>
        <ul className="divide-border border-border divide-y rounded-lg border">
          {people.map((p) => (
            <PersonRow
              key={p.id}
              operationId={operationId}
              person={p}
              me={me}
              teams={teams}
              labels={labels}
              teamWord={teamWord}
              readOnly={readOnly}
            />
          ))}
        </ul>
      </section>

      {me.level === "organizer" && !readOnly ? (
        <section aria-labelledby="role-names" className="flex flex-col gap-3">
          <div>
            <h2 id="role-names" className="text-lg font-semibold">
              Role names
            </h2>
            <p className="text-muted-foreground text-sm">
              Use the words your people already use. Renaming a role never changes what it can do.
            </p>
          </div>
          <RoleLabelsForm operationId={operationId} labels={labels} />
        </section>
      ) : null}
    </div>
  );
}
