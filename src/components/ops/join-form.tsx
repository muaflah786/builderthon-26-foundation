"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { apiFetch, ApiClientError } from "@/lib/api/client";

/** One-tap join: name is prefilled, team is optional. */
export function JoinForm({
  token,
  defaultName,
  teams,
  teamWord,
}: {
  token: string;
  defaultName: string;
  teams: Array<{ id: string; name: string; purpose: string | null }>;
  teamWord: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const result = await apiFetch<{ operationId: string }>("/api/ops/join", {
        method: "POST",
        body: { token, displayName: data.get("displayName"), teamId: data.get("teamId") },
      });
      router.replace(`/app/ops/${result.operationId}`);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? (e.fieldErrors?.displayName?.[0] ?? e.message)
          : "Something went wrong.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="flex flex-col gap-1">
        <Label htmlFor="displayName">Your name (as others will see it)</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={defaultName}
          required
          maxLength={80}
        />
      </div>
      {teams.length > 0 ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor="teamId">Your {teamWord.toLowerCase()}</Label>
          <Select id="teamId" name="teamId" defaultValue="">
            <option value="">I don&apos;t know yet</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <Button type="submit" size="lg" loading={pending}>
        Join
      </Button>
    </form>
  );
}
