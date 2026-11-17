// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
"use client";

import { useRouter } from "next/navigation";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { useApiForm } from "@/components/forms/use-api-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import {
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
  createItemSchema,
  updateItemSchema,
} from "@/lib/validation/items";
import type { ItemDto } from "@/lib/validation/items";

type ItemFormProps = { item?: ItemDto };

/** Create (no `item`) or edit (`item` given) form. Same Zod schemas as the API. */
export function ItemForm({ item }: ItemFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const editing = Boolean(item);

  const form = useApiForm({
    schema: editing ? updateItemSchema : createItemSchema,
    submit: (values) =>
      editing
        ? apiFetch<ItemDto>(`/api/items/${item!.id}`, { method: "PATCH", body: values })
        : apiFetch<ItemDto>("/api/items", { method: "POST", body: values }),
    onSuccess: (saved) => {
      toast({ title: editing ? "Item saved" : "Item created", variant: "success" });
      if (editing) router.refresh();
      else router.push(`/app/items/${saved.id}`);
    },
  });

  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={form.formError} />
      <FormField label="Title" name="title" error={form.fieldErrors.title}>
        <Input defaultValue={item?.title} maxLength={200} required />
      </FormField>
      <FormField
        label="Description"
        name="description"
        error={form.fieldErrors.description}
        hint="Optional, up to 5000 characters"
      >
        <Textarea defaultValue={item?.description ?? ""} rows={5} maxLength={5000} />
      </FormField>
      <FormField label="Status" name="status" error={form.fieldErrors.status}>
        <Select defaultValue={item?.status ?? "open"}>
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ITEM_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" loading={form.pending}>
          {editing ? "Save changes" : "Create item"}
        </Button>
      </div>
    </form>
  );
}
