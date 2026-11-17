# T2: Design System, App Shell & Form Components (wave 2)

**Branch:** `task/t2-ui` · **Read first:** `docs/tasks/_COMMON.md` (all rules apply)

## Objective

Build the small, accessible, re-themeable UI kit and app shell that every feature uses. Then build the form components that connect Zod + `apiFetch` errors to the UI. Follow `docs/MODULE_CONTRACTS.md §UI` exactly.

## You own

- `src/components/ui/**`, `src/components/forms/**`, `src/components/layout/**`
- `src/app/globals.css` (tokens), `src/app/page.tsx` (neutral foundation landing page)
- `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/loading.tsx`
- `src/app/dev/ui/page.tsx`: a component gallery page showing every component and variant. It must render only in development: call `notFound()` when `process.env.NODE_ENV === "production"`.
- `docs/modules/t2-ui.md`

## Must not modify

`src/app/layout.tsx` (coordinator wires the shell in at integration; describe the exact change you want in your report), `src/lib/**`, `src/server/**`, `src/config/site.ts`, `package.json`.

## Dependencies allowed

None (`clsx`, `tailwind-merge` and `cn()` in `src/lib/utils.ts` are already there). **No component library, no icon package, no form library.** Inline SVG for the few icons needed.

## Requirements

1. **Tokens** in `globals.css`: keep the existing semantic token names and add only what is needed (e.g. `--ring`, `--radius`, `--success`, `--warning`). Light + dark via `prefers-color-scheme`. Visible `:focus-visible` ring.
2. **Primitives** (one file each, named exports, `className` + `...props` forwarded, `ref` as a prop per React 19): `Button` (variants `primary|secondary|ghost|danger`, sizes `sm|md|lg`, `loading` shows `Spinner` and sets `disabled` + `aria-busy`), `Input`, `Textarea`, `Select` (native), `Checkbox`, `Label`, `Card` (+ `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`), `Badge`, `Alert` (`info|success|warning|danger`, `role="alert"` for danger), `Spinner`, `Dialog` (native `<dialog>` with `showModal`, closes on Esc, returns focus), `Table` parts, `EmptyState`, `Pagination`, `Toast` (`ToastProvider` + `useToast()`; `aria-live="polite"`, auto-dismiss).
3. **Pagination**: props `{ meta: PageMeta }`. Renders links that keep the current search params and change only `page` (use `usePathname`/`useSearchParams`, or accept `searchParams` and build hrefs on the server). Prev/next disabled at the edges. Show "Page X of Y".
4. **Forms** (`components/forms/`):
   - `FormField`: `{ label, name, error?: string[], hint?, children }`. Wires `id`, `htmlFor`, `aria-invalid`, `aria-describedby`.
   - `FormError`: renders a top-level message in a danger `Alert`.
   - `useApiForm<TSchema, TResult>({ schema, submit, onSuccess })`: on submit, reads `FormData` → object, validates with the Zod schema (client-side `fieldErrors` via `z.flattenError`), calls `submit(values)` (which uses `apiFetch`), maps `ApiClientError.fieldErrors`/`message` into state. Returns `{ pending, fieldErrors, formError, onSubmit, reset }`. Must handle checkboxes and empty strings sensibly (document the behavior).
5. **Layout**: `AppShell` (`{ user: SessionUser | null, nav: typeof siteConfig.nav, userMenu?: ReactNode, children }`), `SiteHeader` (app name from `siteConfig`, nav filtered by `auth` flag, mobile-friendly toggle), `SiteFooter`. **Do not import anything from `src/server/**` or auth.**
6. **Pages**: `not-found.tsx`, `error.tsx` (client, "Try again" calls `reset`/`unstable_retry` per Next 16 docs, so read `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`), `global-error.tsx`, `loading.tsx`. `page.tsx`: a neutral landing page (app name, description, links to `/sign-in` and `/sign-up`). No fake marketing content.
7. Responsive at 360px width. Keyboard-usable. Color contrast AA for text on tokens.

## Acceptance criteria

- [ ] `/dev/ui` shows every component/variant in dev; returns 404 in a production build (`npm run build && npm start`).
- [ ] Component tests (jsdom) for: `Button` loading state; `FormField` label/error ids; `useApiForm` (client validation error, server `ApiClientError` with fieldErrors, success path, using a mocked `submit`); `Pagination` hrefs preserve other params; `Dialog` opens/closes.
- [ ] No hard-coded hex colors outside `globals.css` (`grep -rE "#[0-9a-fA-F]{3,6}" src/components` is empty).
- [ ] `npm run check` and `npm run build` pass.
- [ ] Report includes the exact `layout.tsx` change for the coordinator (e.g. wrap `children` in `ToastProvider`).
