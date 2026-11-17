import type { ReactNode } from "react";

/** Centered card layout shared by /sign-in and /sign-up. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="border-border bg-background w-full max-w-sm rounded-lg border p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
