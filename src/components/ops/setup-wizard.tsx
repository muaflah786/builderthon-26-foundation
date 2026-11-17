"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon, type IconName } from "@/components/ops/icons";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { SetupDraft, SetupSuggestion } from "@/lib/ops/setup";
import { PERMISSION_LEVELS } from "@/lib/ops/types";

type Choice = { id: string; name: string; example: string; icon: IconName };

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
    <div className="flex flex-col gap-10">
      <Stepper step={draft ? 3 : pending === "suggest" ? 2 : 1} />
      <section
        aria-labelledby="describe"
        className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12"
      >
        <div className="flex flex-col gap-4 lg:pt-10">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.3em] uppercase">
            Create an operation
          </p>
          <h1
            id="describe"
            className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl"
          >
            What&apos;s <span className="text-brand">happening?</span>
          </h1>
          <p className="text-muted-foreground">
            Describe it in your own words, the way you would to a colleague. We&apos;ll set up
            teams, places and tasks for you.
          </p>
        </div>

        <div className="border-border bg-background flex flex-col gap-6 rounded-3xl border p-5 shadow-[0_24px_60px_-30px_rgba(194,65,12,0.35)] sm:p-7">
          <div className="flex flex-col gap-2">
            <Label htmlFor="situation">Describe the situation</Label>
            <div className="relative">
              <Icon name="pen" className="text-muted-foreground absolute top-3.5 left-3.5 size-5" />
              <Textarea
                id="situation"
                rows={4}
                maxLength={4000}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder={choices[0]?.example}
                className="rounded-2xl pl-11 text-base"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-semibold">Or choose a situation type</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {choices.map((c) => {
                const selected = situation === c.example;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSituation(c.example)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center text-sm font-semibold transition-colors",
                      selected
                        ? "border-brand bg-brand-soft text-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Icon name={c.icon} className={cn("size-7", selected ? "text-brand" : "")} />
                    {c.name}
                  </button>
                );
              })}
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

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={() => suggest()}
              loading={pending === "suggest"}
              disabled={situation.trim().length < 3 || pending !== null}
            >
              {draft ? "Suggest again" : "Suggest a setup"} <Icon name="arrow" className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {draft && suggestion ? (
        <section
          aria-labelledby="review"
          className="border-border bg-background flex flex-col gap-6 rounded-3xl border p-5 shadow-[0_24px_60px_-30px_rgba(194,65,12,0.35)] sm:p-8"
        >
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.3em] uppercase">
              Review and customize
            </p>
            <h2 id="review" className="mt-1 text-3xl font-extrabold tracking-tight">
              Review, refine and <span className="text-brand">launch.</span>
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
                    className="text-brand underline"
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
                  <li key={team.key} className="border-border rounded-2xl border p-4">
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

const STEPS = ["Describe", "Generate", "Review", "Launch"];

/** Progress across Describe → Generate → Review → Launch. */
function Stepper({ step }: { step: number }) {
  return (
    <ol aria-label="Progress" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-bold",
                current
                  ? "bg-brand text-white"
                  : done
                    ? "bg-brand-soft text-brand"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Icon name="check" className="size-4" /> : n}
            </span>
            <span
              className={cn("font-medium", current ? "text-foreground" : "text-muted-foreground")}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
