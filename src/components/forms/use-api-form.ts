"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";
import type { FieldErrors } from "@/lib/errors";

export type UseApiFormOptions<TSchema extends z.ZodType, TResult> = {
  /** Shared Zod schema (the same one the route handler uses). */
  schema: TSchema;
  /** Sends the validated values, normally via `apiFetch`. */
  submit: (values: z.output<TSchema>) => Promise<TResult>;
  /** Runs after a successful submit (navigate, toast, `form.reset()`, ...). */
  onSuccess?: (result: TResult, form: HTMLFormElement) => void | Promise<void>;
};

export type UseApiFormResult = {
  pending: boolean;
  fieldErrors: FieldErrors;
  formError: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  /** Clear errors (does not clear the inputs; call `form.reset()` for that). */
  reset: () => void;
};

const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Converts a form to a plain object for Zod:
 * - Text-like inputs, textarea, select → string. Empty fields stay `""` (use
 *   `optionalText()` for optional fields and `.min(1, ...)` for required ones).
 * - A single checkbox with a given name → `true` / `false` (unchecked included).
 * - Several checkboxes sharing a name → `string[]` of the checked values (`[]` if none).
 * - Several other controls sharing a name (e.g. `<select multiple>`) → `string[]`.
 * - Empty file inputs are omitted; chosen files are `File` objects.
 * - Numbers/dates arrive as strings: use `z.coerce.number()` / `z.coerce.date()`.
 */
export function formToObject(form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form);
  const out: Record<string, unknown> = {};

  for (const [key, value] of data.entries()) {
    if (value instanceof File && value.size === 0 && value.name === "") continue;
    if (key in out) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else {
      out[key] = value;
    }
  }

  const checkboxes = new Map<string, HTMLInputElement[]>();
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement && el.type === "checkbox" && el.name && !el.disabled) {
      checkboxes.set(el.name, [...(checkboxes.get(el.name) ?? []), el]);
    }
  }
  for (const [name, boxes] of checkboxes) {
    out[name] =
      boxes.length === 1 ? boxes[0].checked : boxes.filter((b) => b.checked).map((b) => b.value);
  }

  // <select multiple> with one selection should still be an array.
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLSelectElement && el.multiple && el.name && !el.disabled) {
      out[el.name] = Array.from(el.selectedOptions).map((o) => o.value);
    }
  }

  return out;
}

/**
 * Connects a `<form>` to a Zod schema and an `apiFetch` call.
 *
 *   const form = useApiForm({
 *     schema: createItemSchema,
 *     submit: (values) => apiFetch<Item>("/api/items", { method: "POST", body: values }),
 *     onSuccess: (item) => router.push(`/app/items/${item.id}`),
 *   });
 *   <form onSubmit={form.onSubmit} noValidate>
 *     <FormError message={form.formError} />
 *     <FormField label="Title" name="title" error={form.fieldErrors.title}><Input /></FormField>
 *     <Button type="submit" loading={form.pending}>Save</Button>
 *   </form>
 *
 * Client validation errors and server `ApiClientError` (`fieldErrors` + `message`)
 * land in the same state, so the UI does not care where an error came from.
 */
export function useApiForm<TSchema extends z.ZodType, TResult = unknown>({
  schema,
  submit,
  onSuccess,
}: UseApiFormOptions<TSchema, TResult>): UseApiFormResult {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (inFlight.current) return;
      const form = event.currentTarget;
      reset();

      const parsed = schema.safeParse(formToObject(form));
      if (!parsed.success) {
        const flat = z.flattenError(parsed.error);
        setFieldErrors(flat.fieldErrors as FieldErrors);
        setFormError(flat.formErrors[0] ?? null);
        return;
      }

      inFlight.current = true;
      setPending(true);
      try {
        const result = await submit(parsed.data);
        await onSuccess?.(result, form);
      } catch (error) {
        if (error instanceof ApiClientError) {
          setFieldErrors(error.fieldErrors ?? {});
          setFormError(error.message);
        } else {
          console.error(error);
          setFormError(GENERIC_ERROR);
        }
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [schema, submit, onSuccess, reset],
  );

  return { pending, fieldErrors, formError, onSubmit, reset };
}
