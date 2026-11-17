# 09: Testing & debugging

```text
Help me fix a problem in this repository. Find the root cause; don't paper over symptoms.

SYMPTOM: <<what happens vs what should happen>>
WHERE: <<page URL / API route / test name>>
EVIDENCE: <<exact error text, stack trace, failing test output, screenshot description>>
RECENT CHANGES: <<what changed before it broke, or "unknown">>

Process:
1. Reproduce it with a command or a failing test before changing code (e.g.
   `npx vitest run <file>`, `npx playwright test <spec> --headed`, curl the API).
2. Read the relevant code and check it against docs/MODULE_CONTRACTS.md and
   docs/API_GUIDE.md. This is Next.js 16 (proxy.ts, async params/searchParams/cookies);
   consult node_modules/next/dist/docs/ when framework behaviour is involved.
3. State the root cause in one or two sentences, then make the smallest correct fix.
4. Add or update a test that fails without the fix and passes with it.
5. Run `npm run check` (and `npm run build` / `npm run test:e2e` if the area is covered).

Common causes in this stack: env var missing (see src/lib/env.ts error output), DB not
migrated (`npm run db:migrate`), session/origin mismatch (APP_URL must equal the URL in
the browser), port already in use, `.next` rebuilt by E2E while `npm run dev` is running,
Zod schema and form field names out of sync, missing "use client".

Never delete tests to make them pass, never disable lint/type rules, never weaken auth
checks. Report: root cause, fix, test added, commands run with results.

Pre-demo variant: "Run the full test pass (check, build, test:e2e), then walk the core
journey <<steps>> in the browser at 360px and desktop, and list every defect by severity."
```
