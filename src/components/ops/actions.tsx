"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { withArticle } from "@/lib/ops/terms";

function message(e: unknown) {
  return e instanceof ApiClientError ? e.message : "Something went wrong. Please try again.";
}

/** Re-renders the server page every `seconds` while the tab is visible. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}

/** Start / Mark as Completed / Hand back for one task. */
export function TaskButtons({
  operationId,
  taskId,
  status,
  mine,
  taskWord,
}: {
  operationId: string;
  taskId: string;
  status: string;
  mine: boolean;
  taskWord: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  async function act(action: "start" | "complete" | "release") {
    setPending(action);
    try {
      await apiFetch(`/api/ops/${operationId}/tasks/${taskId}`, {
        method: "POST",
        body: { action, note: action === "complete" ? note : undefined },
      });
      toast({
        variant: "success",
        title:
          action === "start"
            ? `${taskWord} started`
            : action === "complete"
              ? "Marked as completed"
              : "Handed back",
      });
      setNoteOpen(false);
      router.refresh();
    } catch (e) {
      toast({ variant: "danger", title: message(e) });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (status === "todo") {
    return (
      <Button
        onClick={() => act("start")}
        loading={pending === "start"}
        disabled={pending !== null}
      >
        Start {taskWord}
      </Button>
    );
  }
  if (status === "in_progress" && mine) {
    return (
      <div className="flex w-full flex-col gap-2">
        {noteOpen ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`note-${taskId}`}>Anything to add? (optional)</Label>
            <Textarea
              id={`note-${taskId}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => (noteOpen ? act("complete") : setNoteOpen(true))}
            loading={pending === "complete"}
            disabled={pending !== null}
          >
            {noteOpen ? "Confirm completed" : "Mark as Completed"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => act("release")}
            loading={pending === "release"}
            disabled={pending !== null}
          >
            Hand back
          </Button>
        </div>
      </div>
    );
  }
  return null;
}

/** One-screen "Report a Problem" form. */
export function ReportProblem({
  operationId,
  issueWord,
  categories,
  locations,
  locationWord,
}: {
  operationId: string;
  issueWord: string;
  categories: string[];
  locations: Array<{ id: string; name: string }>;
  locationWord: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/ops/${operationId}/issues`, {
        method: "POST",
        body: {
          title: data.get("title"),
          details: data.get("details"),
          category: data.get("category"),
          locationId: data.get("locationId"),
          severity: data.get("urgent") ? "urgent" : "normal",
        },
      });
      form.reset();
      setOpen(false);
      toast({ variant: "success", title: "Sent. Your coordinator can see it now." });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? (e.fieldErrors?.title?.[0] ?? e.message) : message(e));
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="danger" size="lg" className="w-full" onClick={() => setOpen(true)}>
        Report {withArticle(issueWord)}
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border-danger/40 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm"
      noValidate
    >
      <h3 className="font-semibold">Report {withArticle(issueWord)}</h3>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="flex flex-col gap-1">
        <Label htmlFor="issue-title">What&apos;s wrong?</Label>
        <Input id="issue-title" name="title" required maxLength={160} autoFocus />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="issue-category">Type</Label>
          <Select id="issue-category" name="category" defaultValue="">
            <option value="">Not sure</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="issue-location">Where? ({locationWord})</Label>
          <Select id="issue-location" name="locationId" defaultValue="">
            <option value="">Not sure</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="issue-details">Details (optional)</Label>
        <Textarea id="issue-details" name="details" rows={2} maxLength={2000} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="urgent" className="size-5" /> This is urgent (someone could get
        hurt, or work has stopped)
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" loading={pending}>
          Send
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Acknowledge / Resolve for coordinators and team leads. */
export function IssueButtons({
  operationId,
  issueId,
  status,
}: {
  operationId: string;
  issueId: string;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  async function act(action: "acknowledge" | "resolve") {
    setPending(action);
    try {
      await apiFetch(`/api/ops/${operationId}/issues/${issueId}`, {
        method: "POST",
        body: { action },
      });
      router.refresh();
    } catch (e) {
      toast({ variant: "danger", title: message(e) });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex gap-2">
      {status === "open" ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => act("acknowledge")}
          loading={pending === "acknowledge"}
          disabled={pending !== null}
        >
          I&apos;m on it
        </Button>
      ) : null}
      <Button
        size="sm"
        onClick={() => act("resolve")}
        loading={pending === "resolve"}
        disabled={pending !== null}
      >
        Mark resolved
      </Button>
    </div>
  );
}

/** Copy text to the clipboard with feedback. */
export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

/** Rotate / turn off / turn on the invite link. */
export function JoinLinkButtons({
  operationId,
  enabled,
}: {
  operationId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  async function act(action: "rotate" | "enable" | "disable") {
    setPending(true);
    try {
      await apiFetch(`/api/ops/${operationId}/join-link`, { method: "POST", body: { action } });
      toast({
        variant: "success",
        title:
          action === "rotate"
            ? "New link created. The old one no longer works."
            : action === "disable"
              ? "Joining is turned off"
              : "Joining is turned on",
      });
      router.refresh();
    } catch (e) {
      toast({ variant: "danger", title: message(e) });
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => act("rotate")}>
        Make a new link
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => act(enabled ? "disable" : "enable")}
      >
        {enabled ? "Stop new people joining" : "Allow joining again"}
      </Button>
    </div>
  );
}
