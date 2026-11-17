"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type ControlProps = {
  id?: string;
  name?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export type FormFieldProps = {
  label: ReactNode;
  /** Field name; also used as the control's `name` if it has none. */
  name: string;
  /** Messages for this field (e.g. `fieldErrors[name]` from `useApiForm`). */
  error?: string[];
  hint?: ReactNode;
  /** Override the generated control id. */
  id?: string;
  className?: string;
  /** Exactly one form control element (Input, Textarea, Select, Checkbox, ...). */
  children: ReactElement<ControlProps>;
};

/**
 * Label + control + hint + error with the accessibility wiring done for you:
 * `id`/`htmlFor`, `aria-invalid`, and `aria-describedby` (hint and error ids).
 *
 *   <FormField label="Title" name="title" error={fieldErrors.title} hint="Max 200 chars">
 *     <Input required />
 *   </FormField>
 */
export function FormField({ label, name, error, hint, id, className, children }: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? `${name}-${generatedId}`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasError = Boolean(error && error.length > 0);

  const describedBy =
    [children.props["aria-describedby"], hint ? hintId : null, hasError ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        name: children.props.name ?? name,
        "aria-invalid": hasError || undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={controlId}>{label}</Label>
      {control}
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} className="text-danger text-xs font-medium">
          {error!.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
