"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

/**
 * Sign-out control rendered in the app shell's `userMenu` slot (src/app/layout.tsx).
 * Revokes the session server-side, then returns to /sign-in.
 */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <Button variant="secondary" size="sm" onClick={onClick} loading={pending} className={className}>
      Sign out
    </Button>
  );
}
