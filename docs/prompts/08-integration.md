# 08: Integration

```text
You are the integrator. Merge and verify the team's work on <<TARGET BRANCH, e.g. competition>>.

Branches to integrate (with their completion reports):
<<branch name → pasted completion report>>

Procedure:
1. Inspect first: `git status`, `git log --oneline --graph --all -20`, `git worktree list`.
   Never reset, force-push, delete branches or discard uncommitted work.
2. For each branch, review `git diff <target>...<branch>` against docs/MODULE_CONTRACTS.md
   and the task's owned paths. Flag edits outside ownership, contract changes, secrets,
   committed .env/*.db files, fake functionality, and missing tests. Fix small issues;
   send big ones back with a precise description.
3. Decide the merge order from dependencies. Merge one branch at a time with
   `git merge --no-ff`, and after EACH merge run `npm run check`.
4. Migrations: if two branches each added a migration, keep the schema files, delete the
   conflicting generated migrations, and run `npm run db:generate` once to create a
   single migration. Then `npm run db:migrate` on a fresh local.db and `npm run db:seed`.
5. Wire shared pieces requested in the reports: nav (src/config/site.ts), env vars
   (src/lib/env.ts + .env.example), seed registration, layout changes.
6. Full verification: `npm run check`, `npm run build`, `npm run test:e2e`, and a manual
   pass through the core demo journey in the browser.
7. Update docs/INTEGRATION_STATUS.md (what is verified, what is UNTESTED, open issues).
8. If the build is green, deploy (docs/DEPLOYMENT.md) and smoke-test the live URL.

Report: merged branches + commits, issues fixed, issues returned to owners, test results,
deployment status.
```
