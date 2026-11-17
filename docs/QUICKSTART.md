# Competition-day quick start (one page)

**Before the day:** every laptop has run [WINDOWS_SETUP](WINDOWS_SETUP.md) steps 1–3 and `npm run check` is green. One person owns the GitHub repo and Vercel/Turso accounts ([DEPLOYMENT](DEPLOYMENT.md)).

## 0:00 to 0:30 · Understand (all three, no code)

1. Paste the problem statement into [prompt 01](prompts/01-master-product-planning.md) (and [02](prompts/02-problem-analysis.md)). Agree on **one core demo journey** and the MUST list.
2. Run [prompt 04](prompts/04-product-architecture.md) → `docs/PRODUCT.md` (entities, endpoints, pages).
3. Run [prompt 06](prompts/06-module-task-generation.md) → one task file per person, split by entity/feature.

## 0:30 to 0:50 · Adapt the foundation (integrator; others start their task conversation)

```bash
git checkout -b competition
```

- [ ] `src/config/site.ts`: name, description, nav · `.env.local`: `NEXT_PUBLIC_APP_NAME`
- [ ] `src/app/globals.css`: brand colours (`--primary`, ...)
- [ ] `src/app/page.tsx` and `src/app/app/page.tsx`: real landing / signed-in home
- [ ] Copy or delete the reference "items" slice ([COMPETITION_ADAPTATION_GUIDE](COMPETITION_ADAPTATION_GUIDE.md))
- [ ] `npm run check` → commit → push → **first deploy now** (even if almost empty)

## Build loop (each person, in their own conversation/worktree)

- [Prompt 07](prompts/07-claude-implementation.md) for a slice, [05](prompts/05-ui-ux-implementation.md) for screens, [09](prompts/09-testing-and-debugging.md) when stuck.
- Small commits. Schema change → `npm run db:generate` → commit the migration with it.
- `npm run check` before every push.

## Every 60–90 min · Integrate (integrator, [prompt 08](prompts/08-integration.md))

`git pull` → merge → `npm run check && npm run build` → deploy → smoke-test the live URL.

## Last 60 min

- **T-60:** feature freeze. Only fixes from now on.
- **T-45:** `npm run test:e2e`, then walk the demo journey on the **deployed** site at phone width and desktop.
- **T-30:** seed demo data on production (`npm run db:seed` with prod env), run [prompt 10](prompts/10-presentation-preparation.md), rehearse twice.
- **T-10:** fresh incognito window, logged out, zoom 125%, notifications off, local fallback ready (`npm run build && npm start` with seeded `local.db`).

## Emergency commands

```bash
npm run db:migrate && npm run db:seed          # broken local DB (after deleting local.db)
git log --oneline -10 && git revert <sha>      # undo a bad commit safely
npx next dev -p 3001                           # port busy (update APP_URL)
```

Vercel: Deployments → last good one → **Promote to Production**.
