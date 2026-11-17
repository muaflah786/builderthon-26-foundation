# T2: Design system, app shell & forms

Owner: T2. Contract: `docs/MODULE_CONTRACTS.md §UI`.

## What exists

| Path                                                                    | Exports                                                                                                     |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/app/globals.css`                                                   | Semantic tokens (light + dark via `prefers-color-scheme`), global `:focus-visible` ring, dialog backdrop    |
| `src/components/ui/button.tsx`                                          | `Button` (`variant` primary/secondary/ghost/danger, `size` sm/md/lg, `loading`), `buttonClasses()`          |
| `src/components/ui/spinner.tsx`                                         | `Spinner` (`size`, optional `label` → `role="status"`; decorative when no label)                            |
| `src/components/ui/input.tsx`                                           | `Input`, `controlClasses` (shared control style)                                                            |
| `src/components/ui/textarea.tsx`                                        | `Textarea`                                                                                                  |
| `src/components/ui/select.tsx`                                          | `Select` (native)                                                                                           |
| `src/components/ui/checkbox.tsx`                                        | `Checkbox` (native)                                                                                         |
| `src/components/ui/label.tsx`                                           | `Label`                                                                                                     |
| `src/components/ui/card.tsx`                                            | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                           |
| `src/components/ui/badge.tsx`                                           | `Badge` (`variant` neutral/primary/success/warning/danger)                                                  |
| `src/components/ui/alert.tsx`                                           | `Alert` (`variant` info/success/warning/danger, `title`; danger = `role="alert"`, others `role="status"`)   |
| `src/components/ui/dialog.tsx`                                          | `Dialog` (native `<dialog>` + `showModal()`, controlled `open`/`onClose`, `title`, `description`, `footer`) |
| `src/components/ui/table.tsx`                                           | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`    |
| `src/components/ui/empty-state.tsx`                                     | `EmptyState` (`title`, `description`, `action`, `icon`)                                                     |
| `src/components/ui/pagination.tsx`                                      | `Pagination` (`meta: PageMeta`), `pageHref(pathname, searchParams, page)`                                   |
| `src/components/ui/toast.tsx`                                           | `ToastProvider`, `useToast()` → `{ toast({ title, description?, variant?, duration? }), dismiss(id) }`      |
| `src/components/forms/form-field.tsx`                                   | `FormField` (`label`, `name`, `error?: string[]`, `hint?`, `id?`, one control child)                        |
| `src/components/forms/form-error.tsx`                                   | `FormError` (`message`, renders a danger `Alert`, nothing when empty)                                       |
| `src/components/forms/use-api-form.ts`                                  | `useApiForm({ schema, submit, onSuccess })`, `formToObject(form)`                                           |
| `src/components/layout/app-shell.tsx`                                   | `AppShell` (`user`, `nav`, `userMenu?`, `children`): skip link, header, `<main id="main">`, footer          |
| `src/components/layout/site-header.tsx`                                 | `SiteHeader`, `visibleNav(nav, user)`                                                                       |
| `src/components/layout/site-footer.tsx`                                 | `SiteFooter`                                                                                                |
| `src/app/page.tsx`                                                      | Neutral landing page (name, description, links to `/sign-up` and `/sign-in`)                                |
| `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx` | Framework pages (`error`/`global-error` use the Next 16.3+ `retry` prop)                                    |
| `src/app/dev/ui/page.tsx` + `gallery.tsx`                               | Component gallery at `/dev/ui`; `notFound()` when `NODE_ENV === "production"`                               |

All primitives: one file each, named exports, `className` merged with `cn()`, native props (including `ref`, React 19) forwarded via `...props`. Only semantic token classes; no hex colours outside `globals.css`. No component/icon/form libraries; icons are inline SVG.

## Tokens

Existing names kept. Added: `--input` (form control borders, 3:1), `--success(-foreground)`, `--warning(-foreground)`, `--ring` (focus outline), `--radius` (drives `rounded-sm/md/lg/xl`). Some values were adjusted for WCAG AA (`--muted-foreground` light → `#52525b`; dark `--primary` → `#2563eb`, dark `--danger` → `#dc2626`, because white text on the old values was below 4.5:1). Re-theme = edit the two `:root` blocks.

## How to use

```tsx
"use client";
const router = useRouter();
const { toast } = useToast();
const form = useApiForm({
  schema: createItemSchema,
  submit: (values) => apiFetch<Item>("/api/items", { method: "POST", body: values }),
  onSuccess: (item) => {
    toast({ title: "Created", variant: "success" });
    router.push(`/app/items/${item.id}`);
  },
});

<form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
  <FormError message={form.formError} />
  <FormField label="Title" name="title" error={form.fieldErrors.title}>
    <Input />
  </FormField>
  <Button type="submit" loading={form.pending}>
    Save
  </Button>
</form>;
```

### `useApiForm` behaviour

- Reads the form with `formToObject`, validates with `schema.safeParse`. Failures → `fieldErrors` from `z.flattenError`, first form-level error → `formError`. `submit` is not called.
- On success calls `submit(parsed.data)` then `onSuccess(result, formElement)`. Double submits are ignored while `pending`.
- `ApiClientError` → `fieldErrors = error.fieldErrors ?? {}`, `formError = error.message`. Any other error → generic message (logged to console). An error thrown by `onSuccess` is handled the same way.
- `reset()` clears errors only; call `form.reset()` (the DOM method, available in `onSuccess`) to clear inputs.

`formToObject` conversion rules:

| Control                                    | Value                                                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| text/email/password/textarea/single select | `string`. **Empty stays `""`**: use `.min(1, "Required")` for required fields, `optionalText()` for optional ones (turns `""` into `undefined`) |
| number/date inputs                         | `string`: use `z.coerce.number()` / `z.coerce.date()`                                                                                           |
| one checkbox with a name                   | `boolean` (`false` when unchecked, the `value` attribute is ignored)                                                                            |
| several checkboxes sharing a name          | `string[]` of checked values (`[]` when none)                                                                                                   |
| `<select multiple>`                        | `string[]`                                                                                                                                      |
| other repeated names                       | `string[]`                                                                                                                                      |
| file input                                 | `File` (omitted when no file chosen)                                                                                                            |
| disabled controls                          | omitted (standard `FormData` behaviour)                                                                                                         |

### Pagination

`<Pagination meta={meta} />` reads `usePathname()` + `useSearchParams()` and builds links that change only `page` (page 1 removes the param). Prev/Next render as `aria-disabled` spans at the edges. Because it uses `useSearchParams`, a **statically** rendered page must wrap it in `<Suspense>`; list pages that read `searchParams` are dynamic and need no wrapper.

### Dialog

Controlled: `<Dialog open={open} onClose={() => setOpen(false)} title="..." footer={...}>`. Esc, the × button and a backdrop click call `onClose`. Focus is trapped by the browser (`showModal`) and returned to the previously focused element on close.

### Layout

`AppShell`/`SiteHeader` never import auth or `src/server/**`: the caller passes `user` and the `userMenu` slot. Nav items with `auth: true` are shown only when `user` is non-null. Signed out, the header shows Sign in / Sign up links. Below `md` the nav collapses behind a menu button (`aria-expanded`/`aria-controls`); the menu closes on navigation.

## Known limitations

- `FormField` clones its single child to inject `id`/`name`/`aria-*`; it expects one element (not a fragment). For a checkbox with a label to its right, compose `Checkbox` + `Label` manually (see the gallery).
- `Toast` uses one polite live region for all variants (danger toasts are not assertive); use `Alert` for errors that must interrupt.
- Pages (`page.tsx`, `not-found.tsx`, ...) render plain containers and rely on `AppShell` (wired into `layout.tsx` at integration) for the `<main>` landmark. Until then they render without header/footer.
- Responsive/360px, keyboard and contrast were checked by reasoning about the classes/token values and in the jsdom tests, not with an automated a11y tool.
