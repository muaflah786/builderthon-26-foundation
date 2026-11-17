import type { ComponentProps } from "react";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldProps = ComponentProps<"input"> & {
  name: string;
  label: string;
  errors?: string[];
};

/** Labelled input with an accessible error message (T2 FormField + Input). */
export function Field({ name, label, errors, ...props }: FieldProps) {
  return (
    <FormField label={label} name={name} error={errors}>
      <Input {...props} />
    </FormField>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  return <FormError message={message} />;
}

export function SubmitButton({ pending, children }: { pending: boolean; children: string }) {
  return (
    <Button type="submit" loading={pending} className="w-full">
      {children}
    </Button>
  );
}

/** Turns a Better Auth client error into a user-facing message. */
export function authErrorMessage(error: { status?: number; message?: string }): string {
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  return error.message || "Something went wrong. Please try again.";
}
