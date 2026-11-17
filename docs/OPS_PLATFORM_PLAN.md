# Universal Operations Platform: Audit and MVP Plan

> Status: **PROPOSAL, awaiting team approval.** No implementation code has been written.
> Branch: `claude/universal-ops-platform-mvp-0ea0b1` (from `main` @ `1c0c0fb`). Date: 2026-11-17.

Product principle: **ONE PLATFORM. EVERY SITUATION.** Success criterion: **zero training.**
The lifecycle is DESCRIBE → GENERATE → REVIEW → LAUNCH → COORDINATE → CLOSE.

> Revision 2 (strategic correction): the product is universal. No scenario is primary. Festival, exam
> day and flood/emergency response are three equal **demonstration configurations** of one engine.
> Conference, sports and distribution/logistics are supported the same way. See §2A.

---

## 1. Repository assessment (Phase 0)

### 1.1 State

- Git: clean tree on a fresh worktree branch, identical to `main` (`1c0c0fb`, T6 merged). Task branches T1–T6 are all merged. `sample/notes-app` is unmerged by design.
- 251 tracked files. Migrations `0000_auth`, `0001_items`. No product code for operations yet. There is **no product blueprint** in the repo or the parent folder; this plan relies on the directive.
- Production: Vercel + Turso deployed and verified (docs/DEPLOYMENT_REPORT.md). CI (GitHub Actions) verified: check + 14 E2E.
- Baseline of this worktree: see §1.5.

### 1.2 What exists and is reusable

| Foundation piece                                                                                                                                                                                          | What it gives us                                                                         | Reuse plan                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared contracts (`AppError`, `apiHandler`/`parseJson`/`parseQuery`, `apiFetch`, `env`, `db`, `cn`)                                                                                                       | Envelope, errors, validation, fetcher                                                    | Use as-is for every new endpoint                                                                                                                                               |
| T1 Better Auth (email+password, DB sessions, global `role` user/admin), `requireUser`/`requireRole`, `proxy.ts`, `SignUpForm({ next })` / `SignInForm` (auto sign-in after sign-up, safe `next` redirect) | Sign-in for everyone                                                                     | **Decided:** organizers and participants both use email sign-up as-is. The join page embeds the existing forms with `next=/join/<token>`. No auth changes, no anonymous plugin |
| T2 design system (Button, Input, Select, Card, Badge, Alert, Dialog, Table, Toast, EmptyState, Pagination, FormField, `useApiForm`), AppShell, semantic tokens, dark mode                                 | Accessible primitives, WCAG-AA tokens                                                    | Reuse all primitives. Add ops-specific composites (status pill, task row, bottom tab bar). Re-tune tokens for the product look                                                 |
| T3 items slice + `new-resource` generator + `query-helpers`                                                                                                                                               | Proven pattern: schema → Zod → service with authz → route → page; search/sort/pagination | Pattern for every ops resource. **Generator only partly fits**: it scaffolds owner-scoped resources, ours are operation-scoped. Copy the pattern by hand where needed          |
| T4 test helpers (`setupTestDb`, `mockSession`, `callRoute`), Vitest, Playwright, CI                                                                                                                       | Real DB tests of services and routes; browser tests                                      | Use for all stages. Playwright `context.setOffline()` covers offline E2E                                                                                                       |
| T5 logger, `rateLimit`, `fetchJson`, storage (off)                                                                                                                                                        | Logging, per-instance rate limits                                                        | Rate-limit join and AI endpoints. Uploads (photos) stay off for MVP                                                                                                            |
| T6 provider layer (`AiProvider`, `resolveProvider`, Ollama/OpenRouter-free/Gemini-free adapters, error kinds, timeout)                                                                                    | Provider-agnostic, free-tier-only LLM access with safe errors                            | **Reuse the provider layer only.** T6's chat service, BM25 knowledge, prompts and widget are the _website visitor assistant_ and stay separate and untouched                   |

### 1.3 Gaps, conflicts and issues found

| #   | Finding                                                                                                                                                                                                                                                                             | Impact on this product                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Roles are **global** (`user`/`admin`). No organizations, workspaces or memberships. ARCHITECTURE.md lists multi-tenancy as "not included".                                                                                                                                          | Need operation-scoped membership and roles. This is the main new architecture.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| G2  | Existing authz pattern = owner-scoped, with `admin` seeing everything.                                                                                                                                                                                                              | Ops need membership-scoped isolation. **Decided:** global admin does **not** bypass operation isolation (see §8).                                                                                                                                                                                                                                                                                                                                                                                                                |
| G3  | Sign-up requires email + password; there is no email verification (KNOWN_LIMITATIONS #7).                                                                                                                                                                                           | **Decided:** participants sign up with email. Friction is minimised in the join page (below). Emails are self-asserted, so an email is never treated as verified identity.                                                                                                                                                                                                                                                                                                                                                       |
| G4  | T6 providers are stream-only and chat-shaped; no structured JSON generation.                                                                                                                                                                                                        | Collect the stream, extract JSON, Zod-validate. No change to T6 files needed.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| G4b | **Decided: Gemini free tier** (`AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`, existing T6 adapter). T6's `AI_MAX_OUTPUT_TOKENS` default (512) is too small for a setup. On the free tier Google may use prompts to improve its products; quotas are per minute and per day. | Ops AI passes its own output limit (new `OPS_AI_MAX_OUTPUT_TOKENS`, default 2048, max 4096). AI returns compact _changes_ to the pack baseline, not a full setup, to stay within quota. **Only the organizer's situation text and generic setup data are sent**: never member names, emails, phones or issue details. The describe screen says so in one line. The key is set by the owner in `.env.local` / Vercel only, never committed. Quota is tested before the demo; if it runs out, the pack setup is used and labelled. |
| G5  | No offline support: no service worker, manifest, IndexedDB or outbox. Next 16's `experimental.useOffline` only retries navigations/Server Actions, not our `apiFetch` mutations, and does not survive a reload.                                                                     | Build our own outbox + sync endpoint + small hand-written service worker (Next's PWA guide pattern, no extra library).                                                                                                                                                                                                                                                                                                                                                                                                           |
| G6  | No realtime. Serverless (Vercel) + SQLite make websockets/SSE awkward.                                                                                                                                                                                                              | Polling (10–15 s, paused when tab hidden) for the command centre.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| G7  | No QR generation.                                                                                                                                                                                                                                                                   | **Decided:** add `uqr` (MIT, zero dependencies, 79 KB unpacked, SVG output), pinned to an exact version (0.1.3 at time of writing). Rendered as SVG on the server, so no QR JavaScript is sent to the browser, and it prints sharply. Chosen over `qrcode` 1.5.4, which pulls in `yargs`, `pngjs` and `dijkstrajs`. Risk: it is a 0.x package. Mitigation: exact pin, wrapped behind one `renderQrSvg(url)` helper so it can be swapped.                                                                                         |
| G8  | Rate limits are in-memory per instance (documented).                                                                                                                                                                                                                                | Acceptable for demo; noted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| G9  | Root layout reads the session, so every page is dynamic (documented).                                                                                                                                                                                                               | Field page offline load must come from the service-worker cache, not static HTML.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| G10 | `docs/KNOWN_LIMITATIONS.md` rows 10–14 are five duplicated copies of row 1.                                                                                                                                                                                                         | Doc bug; fix in Stage 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| G11 | Open ops items from INTEGRATION_STATUS: Turso token rotation, DB env vars set to Production-only (preview deploys would write to prod), 2FA.                                                                                                                                        | Must be done before real participant data goes to production. Owner action, not code.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| G12 | Navigation still shows foundation demos (`Items`, `AI demo`).                                                                                                                                                                                                                       | **Decided:** remove both entries from `siteConfig.nav` in S0. Routes, code and their tests stay working and reachable by URL; nothing is deleted.                                                                                                                                                                                                                                                                                                                                                                                |
| G13 | This worktree had no `node_modules`.                                                                                                                                                                                                                                                | Installed with `npm ci` for the baseline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### 1.4 Build, test and deployment setup

`npm run check` = `next typegen && tsc --noEmit` + ESLint + Vitest. `npm run build`, `npm run test:e2e` (Playwright, own `e2e.db`). CI runs check + E2E on push. Migrations: `drizzle-kit generate` (coordinator only), applied with `db:migrate`. Deploy: Vercel + Turso (libSQL).

### 1.5 Baseline verification on this branch

Filled in from the actual run: see the bottom of this file ("Baseline run").

---

## 2. Product architecture

```
Organizer (desktop or phone)          Participant (phone, possibly offline)
  /app/ops/new  Describe→Review→Launch   /join/<code>  →  /app/ops/<id>  (field view)
  /app/ops/<id>/command (live)                 │  outbox (IndexedDB) ── POST /api/ops/<id>/sync
        │ apiFetch                               │  snapshot (IndexedDB) ◀─ GET /api/ops/<id>/field
        ▼                                        ▼
  src/app/api/ops/**  (thin: apiHandler + Zod)
        ▼
  src/server/services/ops/*   ← every function: (user, operationId, input)
        │   requireMember(user, opId, permission)  → 404 for non-members
        │   all writes append to activity_log in the same transaction
        ▼
  db (Drizzle/libSQL)       src/server/ops-ai/* ──▶ T6 resolveProvider() (read-only reuse)
                                   └─ fallback: deterministic template engine (no AI needed)
```

New code lives in new paths only: `src/server/db/schema/ops.ts`, `src/lib/validation/ops/*`, `src/lib/ops/scenarios/*` (scenario packs, data only), `src/server/services/ops/*`, `src/server/ops-ai/*`, `src/app/api/ops/**`, `src/app/app/ops/**`, `src/app/join/**`, `src/components/ops/**`, `public/sw.js`, `src/app/manifest.ts`. Small edits to coordinator/T1/T2 files are listed per stage.

---

## 2A. Universality model: one engine, many configurations

The engine knows only generic concepts: operation, people, teams, roles, locations, tasks, schedule, issues, updates, activity. **Everything situation-specific is data**, never code.

### Scenario packs (starting points, not product modes)

A scenario pack is a typed, Zod-validated data object in `src/lib/ops/scenarios/<pack>.ts`. It contains:

| Part                                                                        | Example: festival / exam day / flood response                                                                                                        |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recognition hints (keywords, phrases)                                       | "fest, stage, stalls" / "exam, invigilator, hall, paper" / "flood, rescue, relief camp, evacuation"                                                  |
| Vocabulary (what people see)                                                | participant: Volunteer / Invigilator / Responder; team: Team / Hall / Unit; location: Venue / Exam hall / Zone; issue: Problem / Incident / Incident |
| Role labels mapped onto the 4 fixed permission levels                       | lead = Team lead / Hall supervisor / Unit leader                                                                                                     |
| Team, location, task and schedule blueprints, scaled by extracted numbers   | stage, registration, food… / one team per hall, paper distribution, attendance… / rescue, relief camp, medical, supplies…                            |
| Times as offsets from start/end                                             | "Set up desks: start − 2 h" / "Collect papers: start − 30 min" / "Shift handover: every 6 h"                                                         |
| Task and issue categories, severity hints                                   | logistics, crowd… / malpractice, missing paper… / trapped person (urgent), shortage…                                                                 |
| Dashboard emphasis (order of "Needs attention" signals, highlighted metric) | delayed tasks / halls not ready before start time / urgent incidents and unassigned requests                                                         |
| Closure summary sections                                                    | per-team completion / per-hall incidents / people helped, supplies distributed, open incidents                                                       |

Packs planned: **festival, exam day, flood/emergency** (demo set), **conference, sports event, distribution/logistics**, and **general** (fallback for anything else).

### Rules that keep it universal

1. **No branching on scenario in shared code.** Components, services and DB logic never contain `if (scenario === "...")`. A Vitest guard test scans `src/server/services/ops`, `src/components/ops` and `src/app/**/ops` for pack ids and fails if one appears.
2. **An operation is self-describing.** At Launch, the resolved vocabulary, role labels, categories and dashboard emphasis are copied into `operations.config_json`. After that the pack is irrelevant: organizers can rename anything, and changing a pack later never alters running operations.
3. **UI text comes from the operation's vocabulary.** A `terms(op)` helper (server) / `useOpsTerms()` (client) supplies nouns. No shared component hard-codes "volunteer", "stage" or "hall".
4. **Fixed engine, renamable labels.** The task state machine (`todo → in_progress → done`, plus `blocked`/`cancelled`) and the 4 permission levels are fixed so permissions and sync stay safe; their display labels are configurable per operation.
5. **Packs are optional.** A description that matches no pack still works: general pack + extracted numbers, or a fully AI-generated setup that is validated against the same schema.
6. **Neutral branding.** Landing page, examples and quick-pick chips show all situations equally; the example placeholder rotates across scenarios.

### Generation pipeline (same for every situation)

```
description ─▶ 1. recognise  (keyword score per pack; AI classification when available)
                  ambiguous → "Is this closer to: Exam day · Conference · Something else?"
            ─▶ 2. extract   (headcount, number of halls/zones/venues, named places, start/end, shifts)
            ─▶ 3. instantiate pack blueprints, scaled to the numbers
            ─▶ 4. optional AI refinement (add/remove/rename within schema; or a full custom setup)
            ─▶ 5. validate (Zod + size caps) ─▶ review screen with "We assumed…" notes ─▶ Launch
```

Steps 1–3 and 5 work with no AI and no network to a provider.

---

## 3. Data model (one new schema file, generated as separate migrations)

All tables carry `id`, `created_at`, `updated_at` (existing helpers) and `operation_id` (except `operations`), indexed. Every query is filtered by `operation_id` inside the service.

| Table               | Key fields                                                                                                                                                                                                                                                                                                                     | Why / user problem                                                                                           | MVP    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------ |
| `operations`        | name, situation (original text), template_id (informational only: which pack it started from, nullable), config_json (vocabulary, role labels, categories, dashboard emphasis; validated), status (`live`/`closed`/`archived`), starts_at, ends_at, timezone, join_token, join_enabled, created_by, closed_at/by, summary_json | The workspace. One row per real-world event                                                                  | P0     |
| `operation_members` | operation_id, user_id, display_name, phone (optional), role (`organizer`/`coordinator`/`lead`/`member`), team_id, status (`active`/`removed`), joined_at; unique(operation_id, user_id)                                                                                                                                        | Temporary roles that exist only inside one operation                                                         | P0     |
| `teams`             | name, purpose, color, location_id, lead_member_id                                                                                                                                                                                                                                                                              | "My Team"                                                                                                    | P0     |
| `locations`         | name, directions (text)                                                                                                                                                                                                                                                                                                        | "Where should I go?" (text only; no maps)                                                                    | P0     |
| `tasks`             | title, instructions, category, priority (`normal`/`high`), status (`todo`/`in_progress`/`blocked`/`done`/`cancelled`), team_id, assignee_member_id, location_id, starts_at, due_at, version, started_at, completed_at/by, completion_note, verified_at/by                                                                      | Core work unit; `version` for conflict detection; verification separate from completion                      | P0     |
| `schedule_items`    | title, starts_at, ends_at, location_id, team_id (nullable = everyone)                                                                                                                                                                                                                                                          | "My Schedule"                                                                                                | P0     |
| `issues`            | title, details, category (from config), severity (`normal`/`urgent`), status (`open`/`acknowledged`/`resolved`), task_id, location_id, reported_by, assignee_member_id, acknowledged_at/by, resolved_at/by, resolution_note, verified_at/by, client_occurred_at, version                                                       | "Report a Problem" → acknowledge → resolve → verify                                                          | P0     |
| `announcements`     | body, priority, created_by, team_id (nullable)                                                                                                                                                                                                                                                                                 | "Important Updates" is #3 in the field UI, so a minimal version is pulled from P1 into P0 (post + list only) | P0-min |
| `activity_log`      | actor_member_id, entity_type, entity_id, action, data_json, client_occurred_at                                                                                                                                                                                                                                                 | Append-only audit history, recent activity feed, summary timeline                                            | P0     |
| `client_mutations`  | id = client mutation id (PK), operation_id, member_id, kind, result_json                                                                                                                                                                                                                                                       | Idempotency: a resent offline update is applied once                                                         | P0     |

Deliberately **not** added: separate `organizations` table (one operation = one workspace; an org layer can wrap it later without changing these tables), user-defined status workflows (fixed state machine with per-operation labels instead, §2A rule 4), resources, check-ins, task comments (P1).

Derived, not stored: "delayed" = `due_at < now` and status not `done`/`cancelled`.

Auth schema change: **none** (email sign-up decided; T1 files stay untouched).

---

## 4. Permissions (enforced in services, never only in UI)

**Decided (revision 3).** Four fixed internal permission levels with stable identifiers:
`organizer`, `coordinator`, `lead`, `member`. These identifiers are the only thing permission
checks use. Display labels are never compared in code.

- Display labels live in each operation's `config_json.roleLabels` (`{ organizer, coordinator, lead, member }`), copied from the scenario pack at Launch. Examples only, not hard-coded:
  festival: Event Organizer / Department Coordinator / Team Leader / Volunteer;
  exam: Exam Controller / Chief Invigilator / Hall Supervisor / Invigilator;
  flood: Incident Commander / Response Coordinator / Unit Leader / Responder.
- Organizers may rename labels and may assign or reassign people to levels and teams. Team names and responsibilities stay editable.
- No custom permission levels or access rules in the MVP. The Zod schema for `config_json` accepts labels only for the four fixed keys.
- Changing a pack never touches existing operations (labels are already saved on the operation).
- Tests: one permission-matrix test table, run against operations created from every pack, plus a test that renaming a label changes no access.

| Action                                                                           | Organizer | Coordinator |        Team lead        | Member |
| -------------------------------------------------------------------------------- | :-------: | :---------: | :---------------------: | :----: |
| View operation, own tasks, team, schedule, announcements                         |     ✓     |      ✓      |            ✓            |   ✓    |
| Start/complete own tasks, report issues                                          |     ✓     |      ✓      |            ✓            |   ✓    |
| View all tasks/issues, command centre                                            |     ✓     |      ✓      |        own team         |   —    |
| Create/assign/edit tasks                                                         |     ✓     |      ✓      |        own team         |   —    |
| Acknowledge/resolve issues                                                       |     ✓     |      ✓      |        own team         |   —    |
| Verify task completion / issue resolution                                        |     ✓     |      ✓      | own team (not own work) |   —    |
| Post announcements                                                               |     ✓     |      ✓      |        own team         |   —    |
| Assign people to teams; set level `lead`/`member`                                |     ✓     |      ✓      |            —            |   —    |
| Set level `coordinator`/`organizer`; rename role labels, teams, responsibilities |     ✓     |      —      |            —            |   —    |
| Share / rotate / disable join link                                               |     ✓     |      ✓      |            —            |   —    |
| Close / archive / export                                                         |     ✓     |      —      |            —            |   —    |

Non-members get **404** for everything (no existence leaks). Nobody verifies their own completion.

---

## 5. Main user journeys

1. **Organizer setup (target under 3 minutes).** Sign in → "Start a new operation" → one text box ("Describe what's happening") + optional quick-pick chips for every supported situation plus "Something else" + when it starts/ends → **Suggest a setup** → review screen (teams, locations, tasks, schedule as editable lists; "We assumed…" callouts; source label "From template" or "Suggested by AI") → **Launch** → share screen with QR, link and "Copy invite message".
2. **Participant join (target under 60 seconds).** Scan QR → `/join/<token>` shows operation name, date, organizer → if signed out, the **same page** shows a short "Create your account to join" form (name, email, password; "Already have an account? Sign in" toggle) → account is created and signed in automatically → returns to the join page → one tap **Join** (display name prefilled, optional phone) → lands on "You're in _{team}_ · _{role label}_ · Go to _{location}_ · Your first task: _{task}_ by _{time}_", in the operation's own words (e.g. "Hall B · Invigilator · Collect question papers by 9:30" or "Rescue Unit 2 · Responder · Report to Zone 3 relief camp").
3. **Field work.** Start Task → Mark as Completed (optional note) → Report a Problem (one screen: what's wrong, where, urgent?) → Need Help? (shows team lead and coordinator name/phone).
4. **Coordination.** Command centre shows "Needs attention" first (urgent issues, delayed tasks, unassigned tasks, teams with nobody, ordered by the operation's dashboard emphasis), then counts, team progress, upcoming schedule, recent activity. One click to assign, acknowledge, resolve or verify.
5. **Offline field user.** Updates are saved on the phone with a visible "Not sent yet (3)" badge; sent automatically when back online; any conflict is shown to the person, never dropped.
6. **Closure.** Close Operation → pre-close check ("4 tasks not finished, 1 issue open: leave as unfinished / mark cancelled") → operation becomes read-only, join link disabled → summary page (completion by team, delays, issues and response times, unverified completions, timeline) → Export CSV / Print → Archive. Nothing is auto-deleted.

---

## 6. Zero-training UX strategy

- **One primary action per screen**, written as a verb ("Start Task", "Mark as Completed", "Report a Problem", "Launch Operation").
- **Role decides the home screen.** Members never see configuration. Organizers/coordinators get the command centre plus a "See the field view" toggle.
- **"Now" card first** on the field home: the single most important thing (next task, its place and time, or an urgent announcement).
- **Defaults over questions.** Setup asks only for the description and the time window. Everything else has a default and an editable "We assumed…" note. Launch works with tasks unassigned; people pick or get assigned later.
- **The situation's own words:** every noun on screen comes from the operation's vocabulary (Volunteer / Invigilator / Responder; Team / Hall / Unit), so people see the language they already use. Engine terms never appear: no words like schema, module, workflow, sync conflict ("This task was changed by your coordinator while you were offline").
- **Mobile field layout:** bottom bar with 4 tabs (Tasks, Team, Updates, Schedule) and a persistent "Report a Problem" button; touch targets ≥ 44 px; works at 320 px width.
- **Visible system state:** online/offline indicator, "Not sent yet" counts, last updated time on the command centre.
- **Progressive disclosure:** task details (instructions, location, contact) expand from the task row; advanced settings live behind one "Settings" page for organizers.
- **Visual direction:** restrained neutral palette with one accent and clear status colors (existing tokens re-tuned), strong type hierarchy, few cards, no gradients/glass. Built on existing T2 primitives.

---

## 7. Screens and navigation

| Route                                                              | Who                           | Purpose                                                                                              |
| ------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/`                                                                | public                        | Scenario-neutral landing: "One platform. Every situation.", "Start an operation", "Join with a code" |
| `/app`                                                             | signed in                     | "Your operations" + "Start a new operation"                                                          |
| `/app/ops/new`                                                     | signed-in (non-anonymous)     | Describe → Review → Launch (single page, 3 steps)                                                    |
| `/join/[token]`                                                    | public                        | Join screen                                                                                          |
| `/app/ops/[id]`                                                    | member+                       | Role-aware home: field view (members) or command centre (coordinators+)                              |
| `/app/ops/[id]/tasks`, `/issues`, `/schedule`, `/team`, `/updates` | member+ (scoped)              | Lists; field users see only theirs                                                                   |
| `/app/ops/[id]/people`                                             | coordinator+                  | Teams, roles, assignments                                                                            |
| `/app/ops/[id]/share`                                              | coordinator+                  | QR, link, rotate/disable link                                                                        |
| `/app/ops/[id]/summary`                                            | organizer (coordinators read) | Closure + summary + export                                                                           |

Inside an operation, the header shows the operation name and the user's role. Foundation routes (`/app/items`, `/demo`) keep working but are removed from the product nav (decided).

---

## 8. Security, reliability and offline risks

| Risk                                          | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-operation data leak                     | Single `requireMember()` gate; every query filtered by `operation_id`; integration tests that a member of op A gets 404 on every op-B endpoint                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Global admin bypass                           | **Decided:** the global `admin` role gives **no** access to operations. Admins see and act on an operation only through their own membership, like everyone else. `requireMember()` ignores `user.role` entirely; a test proves an admin who is not a member gets 404 on every operation endpoint. (The T3 items reference slice keeps its own admin-sees-all rule, unchanged.)                                                                                                                                                                                     |
| Join link abuse                               | 128-bit random token; rotate/disable; disabled on close; rate-limited; joining grants only `member`; QR is never treated as proof of attendance or completion                                                                                                                                                                                                                                                                                                                                                                                                       |
| Participant accounts (email sign-up)          | Any signed-in user can join only through a valid join link and only as `member`; a user already in the operation is not duplicated (unique operation+user). Emails are unverified (no email provider), so the plan never treats an email as proof of identity. Forgotten passwords cannot be reset (KNOWN_LIMITATIONS #7): the organizer can remove the old entry and the person rejoins with a new account. Auth rate limit (5 sign-ups/min per instance) could block a crowd joining at once behind one IP; Stage 3 load-checks this and documents a safe setting |
| AI output becoming active unvalidated         | AI only returns a suggestion; Zod schema with size caps; organizer must press Launch; Launch re-validates server-side in one transaction                                                                                                                                                                                                                                                                                                                                                                                                                            |
| AI fabricating facts                          | AI never reports state. Dashboards and summaries are computed from data; optional AI narrative is clearly labelled and built only from computed numbers                                                                                                                                                                                                                                                                                                                                                                                                             |
| AI unavailable                                | Template engine produces a full setup without AI; every screen works without AI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Duplicate offline submits                     | Client mutation id + `client_mutations` PK; resend returns the stored result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Lost offline updates                          | Outbox in IndexedDB; item leaves the outbox only after server ack; failures stay visible with a reason; nothing claims "sent" before ack                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Conflicts                                     | Per-item result `applied` / `duplicate` / `conflict` / `rejected`. Rules: issue reports are create-only (never conflict); a member completing their own still-assigned task applies even if other fields changed; task reassigned or cancelled meanwhile → conflict shown to the user with the current state; mutations after closure are stored as "received after closure" records (visible in the summary) and do not change task state                                                                                                                          |
| Shared phones / stale cache                   | Snapshot + outbox keyed by user and operation; cleared on Leave/sign-out; service worker never caches `/api` responses                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Service worker serving stale app after deploy | Network-first for pages; versioned cache name; `Cache-Control: no-cache` on `sw.js` (Next PWA guide); registered only in production builds                                                                                                                                                                                                                                                                                                                                                                                                                          |
| SQLite single writer / concurrency            | Small transactions; optimistic `version` checks on task/issue updates; fine at event scale                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Personal data                                 | Phone optional, visible only to leads/coordinators; exports organizer-only; production must first rotate the Turso token and limit DB env vars to Production (G11)                                                                                                                                                                                                                                                                                                                                                                                                  |

---

## 9. MVP implementation stages

Each stage ends with `npm run check`, `npm run build`, its own tests, and a short report (implemented / partial / untested).

| Stage                                | Scope                                                                                                                                                                                                                                                                                            | Touches existing files                                         | Acceptance (evidence)                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **S0 Prep**                          | Fix KNOWN_LIMITATIONS duplicates; product name and nav in `siteConfig` (remove `Items` and `AI demo` entries only); record decisions in ARCHITECTURE/MODULE_CONTRACTS                                                                                                                            | docs, `src/config/site.ts`                                     | check + build pass; existing items and assistant E2E specs still pass (checked: no spec clicks the `Items` or `AI demo` nav links). Note: the current `/app` home builds its cards from the nav, so the Items card disappears too; `/app` is replaced in S2 anyway                                           |
| **S1 Core model + authz**            | `ops.ts` schema, Zod schemas, `requireMember` + permission matrix, operation/team/task/issue services, activity log, tests. Local uncommitted migration only (see §11 item 8)                                                                                                                    | none                                                           | Vitest: CRUD per role, permission matrix table-test, cross-op 404 tests, non-member global admin gets 404                                                                                                                                                                                                    |
| **S2 Create + launch (no AI)**       | Scenario-pack schema + `terms()` vocabulary layer; packs: **general, festival, exam day, flood/emergency**; recognise/extract/instantiate pipeline; describe/review/launch UI; manual fallback ("Start blank"); share page with link; universality guard test                                    | `src/app/app/page.tsx`                                         | Vitest: each demo description resolves to the right pack with scaled counts; ambiguous text asks; unmatched text → general setup; guard test passes. Playwright: describe → launch for all 3 demo scenarios                                                                                                  |
| **S3 Join**                          | `/join/[token]` with embedded existing sign-up/sign-in forms (`next` back to the join page), one-tap Join, QR (`uqr` behind `renderQrSvg`) with a printable share sheet, landing "what to do now", leave, rotate/disable link; check sign-up rate limit against a crowd joining from one network | none (imports T1 forms)                                        | Playwright: a new person signs up from the join link and lands on their team and first task; existing user signs in and joins; joining twice does not duplicate; disabled link refused. Vitest: `renderQrSvg` returns a valid SVG for a join URL. Manual: QR scanned with 2 real phones (reported as manual) |
| **S4 Field interface**               | Field home with Now card, My Tasks (start/complete/note), My Team + Need Help, Updates, Schedule, Report a Problem; mobile bottom bar                                                                                                                                                            | AppShell header (operation context)                            | Playwright at 375 px: complete a task and report an issue; role cannot see admin controls                                                                                                                                                                                                                    |
| **S5 Command centre + coordination** | Needs-attention list, counts, team progress, upcoming schedule, activity feed, polling; assign, acknowledge, resolve, verify; minimal announcements; people/roles page                                                                                                                           | none                                                           | Vitest for dashboard aggregates (delayed, counts); Playwright: coordinator sees a new issue within one poll and resolves it                                                                                                                                                                                  |
| **S6 Offline**                       | Field snapshot endpoint, IndexedDB store (no library), outbox + sync endpoint + idempotency + conflict rules, status UI, manifest + `sw.js`                                                                                                                                                      | `next.config.ts` (sw headers)                                  | Vitest: sync idempotency and every conflict rule; Playwright: `setOffline(true)` → complete task + report issue → reload page offline → online → server state correct, no duplicates                                                                                                                         |
| **S7 Closure + summary**             | Pre-close check, close/read-only, summary from data, CSV export, print view, archive                                                                                                                                                                                                             | none                                                           | Vitest: summary numbers equal seeded facts; Playwright: close → join refused → summary visible                                                                                                                                                                                                               |
| **S8 AI + remaining packs**          | Setup suggestion and classification via T6 provider layer with JSON validation and pack fallback (also handles situations no pack covers); optional labelled summary narrative; per-user rate limit; **conference, sports, distribution/logistics** packs (data only)                            | `src/lib/env.ts` + `.env.example` (`OPS_AI_MAX_OUTPUT_TOKENS`) | Vitest with a fake provider: valid JSON accepted, invalid/oversized/timeout/quota → pack fallback; a test that the prompt never contains member names, emails or phones. Manual: real Gemini free-tier run for all 3 demo descriptions, reported separately with the key owner's setup                       |
| **S9 Demo + validation**             | Three labelled demo operations (festival, exam day, flood response) seeded side by side; the full "final product test" E2E run once per demo scenario, mobile/desktop pass, accessibility pass, deploy                                                                                           | seeds                                                          | Full Phase-3 checklist with evidence; T1–T6 tests still green                                                                                                                                                                                                                                                |

Order rationale: the product must work end-to-end **without AI** before AI is added (S8), so the demo cannot fail on a provider. Offline (S6) comes after the field UI it protects exists.

P1 after MVP: task discussions, notifications, resources, QR check-in, better reports, operations Q&A assistant. P2 stays deferred.

---

## 10. Testing and acceptance criteria (Phase 3)

| Criterion                                           | Evidence                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New organizer creates an operation without training | Playwright: description → launch; count of required inputs ≤ 3                                                                                                                                                                                                                                     |
| Participant joins without friction                  | Playwright: link → sign-up on the same page → Join → field home, with no navigation away from the join flow                                                                                                                                                                                        |
| Field user understands assignments                  | Field home shows role, team, location and next task (asserted in E2E); hallway test with 2–3 people who have never seen it (manual, reported as such)                                                                                                                                              |
| Coordinator sees problems                           | E2E: urgent issue and overdue task appear in "Needs attention"                                                                                                                                                                                                                                     |
| Task updates recorded correctly                     | Service tests + activity log entries per transition                                                                                                                                                                                                                                                |
| Permissions                                         | Matrix test per role; cross-operation 404 tests for every route                                                                                                                                                                                                                                    |
| Offline works as designed                           | Playwright offline test incl. offline reload                                                                                                                                                                                                                                                       |
| Sync handles conflicts safely                       | Unit tests per conflict rule; no silent drops                                                                                                                                                                                                                                                      |
| Closure summary accurate                            | Seeded scenario with known counts → summary equals                                                                                                                                                                                                                                                 |
| One platform, every situation                       | Same E2E flow passes for festival, exam day and flood descriptions, each producing its own teams, roles, vocabulary and dashboard emphasis; an off-template description (e.g. "blood donation camp") still launches a usable general setup; guard test proves no scenario branching in shared code |
| T1–T6 intact                                        | Existing 232 unit/integration tests + all E2E specs still pass                                                                                                                                                                                                                                     |

---

## 11. Decisions needed from the team

1. ~~Demo scenario~~ **Decided (revision 2):** no primary scenario; festival, exam day and flood/emergency are equal demo configurations.
2. ~~Roles model~~ **Decided:** 4 fixed internal permission levels with renamable display labels (see §4).
3. ~~Participant identity~~ **Decided:** email sign-up for participants, embedded in the join page.
4. ~~QR dependency~~ **Decided:** add the small library `uqr` (see G7).
5. ~~AI provider~~ **Decided:** Gemini free tier via the existing T6 adapter (see G4b). Owner action: create a `GEMINI_API_KEY` and set it locally and in Vercel.
6. ~~Global admin~~ **Decided:** no automatic access; admins need membership like anyone else.
7. ~~Nav~~ **Decided:** hide `Items` and `AI demo` from the nav; routes kept.
8. ~~Migrations~~ **Decided: generated at merge to `main`**, following AGENTS.md rule 5. Workflow:
   - This branch commits only `src/server/db/schema/ops.ts`, never anything in `drizzle/`.
   - Vitest needs no migrations (`tests/helpers/db.ts` builds tables from the schema files), so unit/integration tests run normally here.
   - Local dev and local E2E (`prepare-db.mjs` runs `drizzle-kit migrate`) use a **local, uncommitted** migration from `npm run db:generate`. Commits stage files by explicit path, and each commit is preceded by a check that `git diff --cached --name-only` lists nothing under `drizzle/`.
   - Schema changes during development: delete the local uncommitted migration and regenerate, so there is always exactly one pending ops migration (no drop-and-create in one generate, per AGENTS.md rule 7).
   - CI runs on pushes to `main`, `task/**`, `competition` and on PRs. A PR from this branch would fail its E2E job (no committed migration), so the merge is done like T1–T6: merge into `main` locally with `--no-ff`, delete the local migration, run `npm run db:generate` on `main` to create `0002_ops`, run `db:migrate` on a fresh DB, full check + build + E2E, then commit and push `main` (only with your go-ahead).
   - Turso production: apply `0002_ops` only after the merge is verified, and after the Turso token is rotated (G11).
9. ~~Deadline~~ **Decided: 23:00 IST tonight (2026-11-17).** Planning finished at ~20:35, so about 2 h 25 min. See §12.

---

## 12. Tonight's build (deadline 23:00 IST)

The full plan above stays the roadmap. Tonight builds only the smallest version that proves the core journey **describe → review → launch → join → do the work → see it on the command centre**, for all three demo situations, on one engine.

| Time (IST)  | Build                                                                                                                                                                                     | Done when                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 20:40–21:00 | S0 nav/name; S1 schema (`operations`, `operation_members`, `teams`, `locations`, `tasks`, `issues`, `activity_log`), `requireMember` + permission levels, core services                   | Vitest: permission levels, non-member 404 (incl. global admin)                            |
| 21:00–21:40 | S2 scenario packs (**general, festival, exam day, flood**) with vocabulary and role labels; recognise/extract/instantiate; Describe → Review (edit/remove teams and tasks) → Launch       | Vitest: each demo description gives its own pack and scaled teams; unknown text → general |
| 21:40–22:10 | S3 join page (embedded sign-up/sign-in, one-tap Join, pick team), QR via `uqr`, share page; S4 field view: Now card, My Tasks (Start Task claims it, Mark as Completed), Report a Problem | Manual + E2E smoke of join → complete task                                                |
| 22:10–22:30 | Minimal command centre: counts, Needs attention (urgent problems, delayed tasks), acknowledge/resolve problems; refresh every 15 s                                                        | Coordinator sees a new problem after refresh                                              |
| 22:30–22:50 | `npm run check`, `npm run build`, one Playwright journey, fixes                                                                                                                           | All green or failures reported                                                            |
| 22:50–23:00 | **Feature freeze**, honest status report, demo steps                                                                                                                                      | —                                                                                         |

Simplifications for tonight (each is a deliberate cut, not a hidden gap):

- **Assignment = claiming.** People pick their team on joining; team tasks show under My Tasks and **Start Task** claims one. No assignment UI.
- **Not built tonight; presented as planned:** offline mode (S6), closure and summary (S7), AI suggestions (S8: the pack engine already produces the setup without AI), announcements, people/role management screens, label renaming UI (labels are saved per operation already), conference/sports/logistics packs, deployment of the new version.
- Demo runs locally (`npm run build && npm start`) with a local, uncommitted migration; production stays on the current foundation until a verified merge.

---

## Baseline run

Run on 2026-11-17 in this worktree after `npm ci`:

- `npm run check`: ✅ typecheck, ✅ lint (0 problems), ✅ Vitest **34 files, 232/232 tests passed**.
- `npm ci` warned that esbuild postinstall scripts were not approved (`npm approve-scripts`); the checks still passed. Worth confirming `npm run build` and E2E before Stage 1.
- `npm run build` and `npm run test:e2e`: **UNTESTED in this audit** (not run).

---

## 13. Status at 20:52 IST, 2026-11-17 (tonight's build)

**Verified** (commands run on this branch, local SQLite with the local uncommitted `0002_ops` migration):

- `npm run check`: typecheck ✅, lint ✅, Vitest **36 files, 251/251** (232 existing + 19 new) ✅
- `npm run build`: ✅
- `npx playwright test`: **27/27** ✅ (14 existing + 13 new), including:
  - describe → launch for festival, exam day and flood, each with its own role labels;
  - full journey: organizer describes and launches → QR/link → a new person signs up on the join page and joins a team → starts and completes a duty → reports an urgent incident → the coordinator sees it under "Needs attention" and resolves it → the participant gets 404 on the share page.
- Manual in the browser pane (dev server): review screen, QR rendering, command centre on desktop, field view at 375 px with no horizontal scroll.

**Implemented**

| Area | What works |
| --- | --- |
| Universal engine | Scenario packs as data (general, festival/event, exam day, flood/emergency); recognise → extract counts (also number words, "3 event locations") → instantiate with per-place teams; "Not quite right?" pack switch; "We assumed…" notes; guard test fails if shared code mentions a pack id |
| Setup | Describe → Review (rename operation, rename the 4 role labels, rename/remove teams, remove tasks) → Launch, in one transaction, validated server-side |
| Permissions | 4 fixed levels; one matrix in `src/lib/ops/permissions.ts`; non-members and global admins get 404 (tested) |
| Joining | `/join/<token>` with sign-up on the same page, one-tap Join with optional team, duplicate-safe, rate-limited; QR via `uqr`; copy link / invite message; new link / stop joining |
| Field view | Role + team + place, "Right now" card, Report a problem (category, place, urgent), My tasks: Start (claims) / Mark as Completed (optional note) / Hand back, team list, Need help contacts, my reports with status; refreshes every 30 s |
| Command centre | Done / in progress / late / open problems; Needs attention in the operation's configured order; urgent first; "I'm on it" / "Mark resolved"; late tasks; per-team progress; recent activity; refreshes every 15 s |
| History | Every launch, join, task and problem change is in `ops_activity` |

**Partial**

- Task conflicts: optimistic `version` check on task updates (second writer gets a clear "refresh" message). No offline queue yet.
- Team leads have the permission to handle their own team's problems in the service, but there is no UI yet to make someone a lead (only organizers exist at launch; people join as members).

**Not built tonight (planned, see §9):** offline mode (S6), closure + summary + export (S7), AI suggestions (S8), announcements, people/role management screens, conference/sports/logistics packs, deployment of this version.

**Repository state:** nothing committed yet. Uncommitted local-only files that must NOT be committed: `drizzle/0002_ops.sql`, `drizzle/meta/0002_snapshot.json`, the change to `drizzle/meta/_journal.json`, `.claude/launch.json`, `local.db`, `e2e.db`.

### Demo steps (local)

```bash
npm run db:migrate && npm run db:seed
npm run build && npm start
```

1. Sign in as `demo@example.com` (seeded demo account) → **Start a new operation**.
2. Tap **Exam day** (or Festival / Flood) → set a start time 1–2 hours ago (so some duties show as late) → **Suggest a setup** → point out the role names and "We assumed…" → **Launch operation**.
3. On a phone on the same network, open the link shown (use the laptop's network IP in `APP_URL` for phones) → create an account → choose a hall → **Join** → **Start Duty** → **Mark as Completed** → **Report an incident** (tick urgent).
4. Back on the laptop: **Go to the command centre** → the urgent incident is first → **Mark resolved**.
5. Repeat step 2 with the flood text to show the same engine with different words, roles and teams.
