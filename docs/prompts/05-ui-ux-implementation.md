# 05: UI/UX implementation

```text
Implement/polish the UI for: <<SCREEN OR FLOW, e.g. "the booking form and my-bookings list">>

Read first: AGENTS.md, docs/modules/t2-ui.md (component catalogue), docs/PRODUCT.md (if it
exists), and look at /dev/ui (component gallery) in the dev server. Use the existing
components in src/components/ui and src/components/forms. Copy patterns from
src/app/app/items/* (list = server component reading searchParams; forms = useApiForm +
FormField + shared Zod schema; delete = Dialog + toast).

Requirements:
- Product context and look: <<audience, tone, brand colours if any>>. Re-theme ONLY via the
  CSS variables in src/app/globals.css (no hard-coded hex colours in components).
- Every screen has intentional loading, empty, error and success states.
- Works at 360px wide and on desktop; keyboard usable; labels on every input; visible
  focus; colour contrast AA.
- No fake buttons or placeholder data in production code paths. If the backend for a
  control does not exist yet, leave the control out and tell me.
- Keep server components by default; add "use client" only where interaction requires it.
- Don't add UI libraries, icon packs or animation libraries.

Files I own for this task: <<LIST, e.g. src/app/app/bookings/**, src/components/bookings/**>>.
Do not edit other files; list needed changes elsewhere at the end.

When done: run `npm run check` and `npm run build`, open the pages in the browser at
360px and 1280px, and report what you verified and anything UNTESTED.
```
