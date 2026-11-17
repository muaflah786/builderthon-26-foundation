"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { signUp } from "@/lib/auth-client";
import { signUpSchema } from "@/lib/validation/auth";
import { authErrorMessage, Field, FormAlert, SubmitButton } from "./field";

type FieldErrors = Partial<Record<"name" | "email" | "password", string[]>>;

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setFieldErrors({});
    setPending(true);
    // Better Auth signs the new user in automatically (autoSignIn defaults to true).
    const { error } = await signUp.email(parsed.data);
    if (error) {
      setFormError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const signInHref = `/sign-in?${new URLSearchParams({ next })}`;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <FormAlert message={formError} />
      <Field
        name="name"
        label="Name"
        autoComplete="name"
        required
        maxLength={100}
        disabled={pending}
        errors={fieldErrors.name}
      />
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
        autoComplete="new-password"
        required
        minLength={8}
        disabled={pending}
        errors={fieldErrors.password}
      />
      <SubmitButton pending={pending}>Sign up</SubmitButton>
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href={signInHref} className="text-brand underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
