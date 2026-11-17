"use client"; // Error boundaries must be Client Components.

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/button";

/** Route-segment error boundary. `retry` re-fetches and re-renders the segment (Next 16.3+). */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Server errors arrive with a generic message; `digest` matches the server log entry.
  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">An unexpected error occurred. You can try again.</p>
      {digest ? (
        <p className="text-muted-foreground font-mono text-xs">Reference: {digest}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Go home
        </Link>
      </div>
    </div>
  );
}
