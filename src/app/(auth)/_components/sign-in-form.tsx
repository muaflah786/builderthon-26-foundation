"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { signIn } from "@/lib/auth-client";
import { signInSchema } from "@/lib/validation/auth";
import { authErrorMessage, Field, FormAlert, SubmitButton } from "./field";

type FieldErrors = Partial<Record<"email" | "password", string[]>>;

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { error } = await signIn.email(parsed.data);
    if (error) {
      setFormError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const signUpHref = `/sign-up?${new URLSearchParams({ next })}`;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <FormAlert message={formError} />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        disabled={pending}
        errors={fieldErrors.email}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        disabled={pending}
        errors={fieldErrors.password}
      />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
      <p className="text-muted-foreground text-sm">
        No account?{" "}
        <Link href={signUpHref} className="text-primary underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </form>
  );
}
