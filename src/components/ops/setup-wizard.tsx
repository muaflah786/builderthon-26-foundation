"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import type { SetupDraft, SetupSuggestion } from "@/lib/ops/setup";
import { PERMISSION_LEVELS } from "@/lib/ops/types";

type Choice = { id: string; name: string; example: string };

function toIso(local: string) {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Describe → Review → Launch on one page. The organizer types ordinary language;
 * the engine suggests a setup; everything is editable before launch.
 */
export function SetupWizard({ choices }: { choices: Choice[] }) {
  const router = useRouter();
  const [situation, setSituation] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [suggestion, setSuggestion] = useState<SetupSuggestion | null>(null);
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [pending, setPending] = useState<"suggest" | "launch" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function suggest(packId?: string) {
    setError(null);
    setPending("suggest");
    try {
      const result = await apiFetch<SetupSuggestion>("/api/ops/suggest", {
        method: "POST",
        body: { situation, packId, startsAt: toIso(startsLocal) },
      });
      setSuggestion(result);
      setDraft(result.draft);
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? (e.fieldErrors?.situation?.[0] ?? e.message)
          : "Something went wrong.",
      );
    } finally {
      setPending(null);
    }
  }

  async function launch() {
    if (!draft) return;
    setError(null);
    setPending("launch");
    try {
      const { id } = await apiFetch<{ id: string }>("/api/ops", { method: "POST", body: draft });
      router.push(`/app/ops/${id}/share?launched=1`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not launch. Please try again.");
      setPending(null);
    }
  }

  const update = (fn: (d: SetupDraft) => SetupDraft) => setDraft((d) => (d ? fn(d) : d));

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="describe" className="flex flex-col gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium">Step 1 of 2</p>
          <h1 id="describe" className="text-2xl font-semibold tracking-tight">
            What&apos;s happening?
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Describe it the way you would to a colleague. We&apos;ll suggest teams, places and
            tasks.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="situation">Describe the situation</Label>
          <Textarea
            id="situation"
            rows={4}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder={choices[0]?.example}
          />
          <div className="flex flex-wrap gap-2" aria-label="Examples">
            {choices.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSituation(c.example)}
                className="border-border hover:bg-muted rounded-full border px-3 py-1 text-sm"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex max-w-xs flex-col gap-2">
          <Label htmlFor="startsAt">When does it start? (optional)</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            value={startsLocal}
            onChange={(e) => setStartsLocal(e.target.value)}
          />
        </div>
        <div>
          <Button
            onClick={() => suggest()}
            loading={pending === "suggest"}
            disabled={situation.trim().length < 3 || pending !== null}
          >
            {draft ? "Suggest again" : "Suggest a setup"}
          </Button>
        </div>
      </section>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {draft && suggestion ? (
        <section aria-labelledby="review" className="flex flex-col gap-6">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Step 2 of 2</p>
            <h2 id="review" className="text-2xl font-semibold tracking-tight">
              Check the setup, then launch
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Set up as: <Badge variant="primary">{suggestion.pack.name}</Badge>{" "}
              <span className="ml-1">
                Suggested from a ready-made template. You can change anything.
              </span>
            </p>
            <p className="mt-2 text-sm">
              Not quite right? Use:{" "}
              {suggestion.alternatives.map((a, i) => (
                <span key={a.id}>
                  {i > 0 ? " · " : ""}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => suggest(a.id)}
                  >
                    {a.name}
                  </button>
                </span>
              ))}
            </p>
          </div>

          {suggestion.assumptions.length > 0 ? (
            <Alert variant="info" title="We assumed">
              <ul className="list-disc pl-5">
                {suggestion.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <div className="flex max-w-md flex-col gap-2">
            <Label htmlFor="opName">Operation name</Label>
            <Input
              id="opName"
              value={draft.name}
              onChange={(e) => update((d) => ({ ...d, name: e.target.value }))}
            />
          </div>

          <div>
            <h3 className="font-semibold">People will see these roles</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PERMISSION_LEVELS.map((level) => (
                <div key={level} className="flex flex-col gap-1">
                  <Label htmlFor={`role-${level}`} className="text-muted-foreground text-xs">
                    {level === "organizer"
                      ? "Runs everything (you)"
                      : level === "coordinator"
                        ? "Watches progress, handles problems"
                        : level === "lead"
                          ? "Leads one team"
                          : "Does the tasks"}
                  </Label>
                  <Input
                    id={`role-${level}`}
                    value={draft.config.roleLabels[level]}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        config: {
                          ...d.config,
                          roleLabels: { ...d.config.roleLabels, [level]: e.target.value },
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold">
              {draft.config.terms.teams} ({draft.teams.length}) and their{" "}
              {draft.config.terms.tasks.toLowerCase()}
            </h3>
            <ul className="mt-2 flex flex-col gap-3">
              {draft.teams.map((team) => {
                const tasks = draft.tasks.filter((t) => t.teamKey === team.key);
                return (
                  <li key={team.key} className="border-border rounded-lg border p-4">
                    <div className="flex items-start gap-2">
                      <Input
                        aria-label={`${draft.config.terms.team} name`}
                        value={team.name}
                        className="font-medium"
                        onChange={(e) =>
                          update((d) => ({
                            ...d,
                            teams: d.teams.map((t) =>
                              t.key === team.key ? { ...t, name: e.target.value } : t,
                            ),
                          }))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={draft.teams.length <= 1}
                        onClick={() =>
                          update((d) => ({
                            ...d,
                            teams: d.teams.filter((t) => t.key !== team.key),
                            tasks: d.tasks.filter((t) => t.teamKey !== team.key),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                    {team.purpose ? (
                      <p className="text-muted-foreground mt-1 text-sm">{team.purpose}</p>
                    ) : null}
                    <ul className="mt-2 flex flex-col gap-1 text-sm">
                      {tasks.map((task) => {
                        const index = draft.tasks.indexOf(task);
                        return (
                          <li key={index} className="flex items-center justify-between gap-2">
                            <span>
                              {task.title}
                              {task.priority === "high" ? (
                                <Badge variant="warning" className="ml-2">
                                  Important
                                </Badge>
                              ) : null}
                            </span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground text-xs underline"
                              onClick={() =>
                                update((d) => ({
                                  ...d,
                                  tasks: d.tasks.filter((_, i) => i !== index),
                                }))
                              }
                              aria-label={`Remove ${task.title}`}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-border flex flex-wrap items-center gap-3 border-t pt-6">
            <Button
              size="lg"
              onClick={launch}
              loading={pending === "launch"}
              disabled={pending !== null}
            >
              Launch operation
            </Button>
            <p className="text-muted-foreground text-sm">
              Next you&apos;ll get a QR code and link for people to join. You can add details later.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
