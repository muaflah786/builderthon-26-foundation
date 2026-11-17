# Status review and configuration engine design

> 2026-11-17, 21:10 IST. Branch `claude/universal-ops-platform-mvp-0ea0b1` at `050e37c`.
> **Design proposal only. Nothing in Part B is implemented.**

**Source used for the review.** The document titled "BUILDERTHON '26 — MASTER PRODUCT BLUEPRINT & DEVELOPMENT HANDOFF" is not in this repository, in the local Desktop/Documents/Downloads folders, or in the connected Google Drive (searched by title and text). Part A therefore compares against the **Master Product Engineering Directive** pasted into this session (systems 1–7, P0/P1/P2 lists, UX, security and validation sections). If the blueprint has requirements that the directive does not, this table will miss them. Please share it and I will re-check.

Rule used: "Fully implemented" only when the requirement works end to end, is enforced server-side, and has an automated test. A basic version is "Partial".

---

## Part A. Status against the directive

### A1. P0 list

| #   | P0 requirement                       | Status                           | Evidence / what is missing                                                                                                                                                                                                          |
| --- | ------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Authentication and workspace access  | **Fully implemented**            | Email sign-up (T1), per-operation membership, non-members and global admins get 404 (Vitest + E2E)                                                                                                                                  |
| 2   | Instant workspace creation           | **Fully implemented**            | Describe → review → launch in one transaction; E2E for festival, exam, flood                                                                                                                                                        |
| 3   | AI-assisted and manual configuration | **Partial**                      | Pack-based suggestions ✅. AI ❌. "Start blank" manual setup ❌. Review can rename/remove but **cannot add** teams, tasks or places, or edit task details                                                                           |
| 4   | Teams and temporary roles            | **Partial** (roles now complete) | **Added 21:15:** People screen to assign team and role after joining, rename role labels after launch, team leads see and handle their own team's problems (Vitest + E2E). Still missing: adding or renaming **teams** after launch |
| 5   | QR/link joining                      | **Fully implemented**            | QR (`uqr`), link, new link, stop joining, sign-up on the join page, duplicate-safe (E2E). Scanning with a real phone: **UNTESTED**                                                                                                  |
| 6   | Task creation and assignment         | **Partial**                      | Tasks come only from the setup; people claim them. **No creating tasks after launch, no assigning to a person**                                                                                                                     |
| 7   | Task status updates                  | **Partial**                      | Start / complete (with note) / hand back with version check ✅. `blocked` status exists but has no UI; no verification step                                                                                                         |
| 8   | Simple schedules                     | **Not implemented**              | Only due times on tasks. No schedule items, no "My Schedule"                                                                                                                                                                        |
| 9   | Live command dashboard               | **Partial**                      | Counts, needs-attention (configured order), late tasks, team progress, activity, 15 s refresh ✅. Missing: upcoming schedule, announcements, assigning from the dashboard                                                           |
| 10  | Issue reporting                      | **Partial**                      | Report (category, place, urgent), acknowledge, resolve ✅. **No assignment to a responsible person, no authorized verification**                                                                                                    |
| 11  | Essential offline operations         | **Not implemented**              | No service worker, snapshot, outbox or sync                                                                                                                                                                                         |
| 12  | Operation closure and summary        | **Fully implemented**            | Organizer close with pre-check, read-only after, summary from records, CSV export with injection guard, print (Vitest + E2E). Separate "archived" state ❌                                                                          |

### A2. Systems 1–7

| System                        | Fully                                                                     | Partial                                                                                | Not implemented                                                                 |
| ----------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1 Instant configuration       | Natural-language description, defaults, preview, fast activation          | Editable setup (rename/remove only)                                                    | AI suggestions, manual blank setup                                              |
| 2 Universal operations engine | Workspaces (operations), people, temporary teams, tasks, activity history | Locations (names only, directions not shown in UI), statuses (fixed, not configurable) | Organizations, schedules, checkpoints, verification                             |
| 3 Live command centre         | Totals, completed, pending, late, reported problems, recent activity      | Active teams (progress shown, no "active" signal)                                      | Upcoming schedule, announcements                                                |
| 4 Field interface             | My tasks, start/complete, report a problem, my team, need help            | View location (name only), progress note (on completion only)                          | Important updates, my schedule, offline                                         |
| 5 Communication and problems  | Reporting, acknowledgement, resolution, history                           |                                                                                        | Announcements, task discussions, assignment to responsible person, verification |
| 6 Offline                     |                                                                           |                                                                                        | All of it                                                                       |
| 7 AI assistance               |                                                                           | Late-task detection exists, but it is deterministic, not AI                            | Workspace creation, structure suggestions, progress and problem summaries, Q&A  |

### A3. Universality, UX, security

| Area                                                  | Status                    | Notes                                                                                                                     |
| ----------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| One engine, situation as data                         | **Fully implemented**     | Packs are data; guard test fails on pack ids in shared code; per-operation vocabulary and role labels                     |
| Supported situations                                  | **Partial**               | Packs: festival/event, exam, flood/emergency, general. Conference, sports, logistics ❌ (they fall back to general today) |
| Mobile-first field UI                                 | **Partial**               | Checked at 375 px, no horizontal scroll. Bottom tab bar ❌                                                                |
| Accessibility                                         | **Partial**               | Labelled controls, AA tokens, landmarks. No audit run                                                                     |
| Server-side authorization, isolation, validated input | **Fully implemented**     | One permission matrix, Zod on every route, isolation tests                                                                |
| Audit history                                         | **Fully implemented**     | Every launch, join, task, problem, link and close change logged                                                           |
| Duplicate prevention / conflicts                      | **Partial**               | Join is idempotent; task updates use a version check. Offline idempotency ❌                                              |
| Deployment of this product                            | **Deliberately deferred** | Runs locally; production stays on the foundation until a verified merge                                                   |

### A4. Deliberately deferred

| Item                                                                                                                     | Why                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| P1: notifications, task discussions, resources, QR check-in, improved reports                                            | After the core lifecycle, per directive. (Announcements were pulled into P0 in the plan but are **not built**) |
| P2: voice/video, GPS, offline maps, predictive AI, autonomous agents, complex analytics, integrations, workflow builders | Per directive                                                                                                  |
| Organizations above operations                                                                                           | One operation = one workspace for the MVP; an org layer can wrap it later                                      |
| Committing migrations from this branch                                                                                   | AGENTS.md rule; generated at merge to `main`                                                                   |
| Production deployment of the new version                                                                                 | Not verified yet; Turso token rotation still pending (G11)                                                     |

---

## Part B. Next phase design: the universal configuration engine

### B1. Principle

An operation is assembled from **modules**. Packs only pick a starting set of modules, words, fields and steps. Organizers can change any of it **while the operation is running**, without rebuilding it and without losing records.

Three things stay fixed so the system stays safe and understandable:

1. **Permission levels** (organizer, coordinator, lead, member). Labels are configurable.
2. **Phases.** Every configurable status maps to one of `waiting`, `active`, `done`, `cancelled`. Dashboards, summaries, permissions and offline sync only read phases, so custom statuses never break them.
3. **Record ownership.** Every row belongs to one operation and is filtered by it.

### B2. Modules

| Module            | Always on? | What people get                                           | Example packs that enable it       |
| ----------------- | ---------- | --------------------------------------------------------- | ---------------------------------- |
| Tasks             | yes        | My tasks, claim/start/complete                            | all                                |
| Teams and people  | yes        | My team, roles, assignment                                | all                                |
| Problems          | default on | Report, respond, resolve                                  | all                                |
| Places            | default on | Where to go, directions                                   | all                                |
| Schedule          | optional   | My schedule, what's next                                  | festival, exam, conference, sports |
| Updates           | optional   | Important announcements                                   | all                                |
| Forms and records | optional   | "Record attendance", "Register arrival", "Log a delivery" | exam, flood, logistics             |
| Resources         | optional   | Stock, quantities, where things are                       | flood, logistics, sports           |

**Switching a module off hides it. It never deletes data.** Switching it back on restores everything. Every switch is logged.

### B3. User journey

1. **Describe** (unchanged). The engine suggests a pack, which pre-selects modules.
2. **Review** gains a "What do you need?" row of module toggles, each with one plain sentence. Defaults come from the pack; "Something else" starts with Tasks, Teams and Problems only.
3. **Launch** (unchanged).
4. **Adjust while running.** The organizer opens **Settings** from the command centre and turns on Schedule mid-event, adds a "Hall ready?" step to tasks, or adds a "Number of candidates present" field. Field users see the change on their next refresh, with no reinstall and no retraining. New items appear in the bottom bar or as a clear button.
5. **Close** (unchanged). The summary includes enabled modules: records per form, resources used, schedule kept or missed.

### B4. Screens

| #   | Screen                                    | Who                                              | Content (minimal)                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Settings hub** `/app/ops/[id]/settings` | organizer (coordinator: Teams, Places, Schedule) | Sections listed on the left (an accordion on phones): Modules · Teams and people · Places · Schedule · Steps · Fields and forms · Words and roles. Each section saves on its own, with a toast                                                                                              |
| 2   | Modules                                   | organizer                                        | One toggle row per module: name, one-sentence purpose, "Hidden, nothing is deleted" note when off                                                                                                                                                                                           |
| 3   | Teams and people                          | organizer, coordinator                           | Teams: name, responsibilities (short list), place, lead. People: name, team dropdown, level dropdown (shown as labels), "Remove from operation". Search when there are more than 20 people                                                                                                  |
| 4   | Places                                    | organizer, coordinator                           | Inline list: name + directions (shown to field users under "Go to …")                                                                                                                                                                                                                       |
| 5   | Schedule                                  | organizer, coordinator                           | Time-ordered list: time, title, place, who (everyone / a team). Add inline. Field: "My schedule" tab, "Next" on the Right-now card                                                                                                                                                          |
| 6   | Steps (workflow)                          | organizer                                        | Per thing (Tasks, Problems, each form): an ordered list of steps, each with a label, a phase chip, and "Needs a check by a lead" toggle. A live preview shows the exact buttons a field user will see ("Start" → "Mark as ready" → "Mark as completed")                                     |
| 7   | Fields and forms                          | organizer                                        | Extra fields on Tasks/Problems/People, and standalone forms. Add a field: label, type (text, number, choice, yes/no, date-time, phone), required, who sees it. A phone-sized preview next to the editor. Forms: name, button text ("Record attendance"), who fills it, who sees the results |
| 8   | Words and roles                           | organizer                                        | Vocabulary (person, team, place, task, problem) and the four role labels, with "where this appears" hints                                                                                                                                                                                   |
| 9   | Field bottom bar                          | everyone                                         | Tasks · Team · Updates · Schedule · More (forms, resources). Only enabled modules appear                                                                                                                                                                                                    |

### B5. Data model changes

| Change                                 | Shape                                                                                                                                                                  | Notes                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `operations.config` (JSON)             | add `modules: Record<ModuleKey, { enabled: boolean }>`, `workflows: { task, issue, ["form:<id>"]: Step[] }` where `Step = { key, label, phase, needsCheck?: boolean }` | Validated by one Zod schema; still copied from packs at launch         |
| `ops_config_revisions`                 | id, operation_id, version, config JSON, changed_by_member_id, created_at                                                                                               | Audit and safe undo of settings changes                                |
| `ops_teams`                            | add `responsibilities` (JSON string list), `lead_member_id`                                                                                                            |                                                                        |
| `ops_tasks.step`, `ops_issues.step`    | text, the current step key; existing `status` becomes the phase                                                                                                        | Migrated from today's statuses one to one                              |
| `ops_field_defs`                       | id, operation_id, target (`task` / `issue` / `member` / `form:<id>`), key, label, type, options JSON, required, visible_to level, position, archived_at                | Archived, never deleted, so old records still render                   |
| `custom` JSON column                   | on `ops_tasks`, `ops_issues`, `ops_members`                                                                                                                            | Validated server-side against current field defs (Zod built from defs) |
| `ops_forms`                            | id, operation_id, name, button_label, fill_level, view_level, archived_at                                                                                              |                                                                        |
| `ops_records`                          | id, operation_id, form_id, submitted_by_member_id, data JSON, step, client_mutation_id (unique), created_at                                                            | Create-only: ideal for offline sync later                              |
| `ops_schedule_items`                   | id, operation_id, title, starts_at, ends_at, location_id, team_id (null = everyone)                                                                                    |                                                                        |
| `ops_resources` + `ops_resource_moves` | name, unit, quantity, location_id / resource_id, delta, note, member_id                                                                                                | Quantity changes are logged, not overwritten                           |

Migrations: each table generated separately (AGENTS.md rule 7), at merge to `main`.

### B6. API changes (all `apiHandler` + Zod, all through `requireMember`)

| Endpoint                                                          | Purpose                                                                                                                      | Who                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `GET/PATCH /api/ops/:id/config`                                   | Read and update modules, words, role labels, workflows (with `expectedVersion` to prevent overwriting someone else's change) | organizer                         |
| `GET/POST/PATCH /api/ops/:id/members[/:mid]`                      | Assign team and level, remove                                                                                                | organizer; coordinator up to lead |
| `POST/PATCH /api/ops/:id/teams[/:tid]`, `/locations`, `/schedule` | Edit structure while running                                                                                                 | organizer, coordinator            |
| `POST/PATCH /api/ops/:id/tasks[/:tid]`                            | Create, edit, assign tasks after launch                                                                                      | coordinator+, lead for own team   |
| `POST /api/ops/:id/tasks/:tid`                                    | Move to a step (replaces start/complete)                                                                                     | per step rules                    |
| `GET/POST/PATCH /api/ops/:id/fields`, `/forms`                    | Define fields and forms                                                                                                      | organizer                         |
| `POST /api/ops/:id/forms/:fid/records`, `GET …/records`           | Submit and view records                                                                                                      | fill_level / view_level           |
| `POST/PATCH /api/ops/:id/resources`, `POST …/moves`               | Stock and movements                                                                                                          | coordinator+, lead for own team   |

### B7. Permission requirements

- All checks use the four fixed levels. No custom access rules (decision from revision 3).
- Settings that change what everyone sees (modules, words, roles, workflows, fields, forms) are **organizer only**.
- Coordinators edit teams, places, schedule and tasks; they can set people to `lead` or `member`, never `coordinator` or `organizer`.
- A step marked "Needs a check by a lead" can only be passed by a lead of that team or a coordinator+, and **never by the person who did the work**.
- Field visibility (`visible_to`) is enforced in the service when building responses, not only hidden in UI.
- Disabled modules are refused server-side too (not only hidden).
- Every settings change writes a config revision and an activity entry.

### B8. Reusable components

| Component                                                                         | Used by                                                     |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `SettingsSection` (title, one-line help, save state)                              | every settings screen                                       |
| `ToggleRow` (label, description, switch)                                          | modules, field options                                      |
| `EditableList` (add, rename, reorder, archive inline)                             | teams, places, schedule, steps, form fields, choice options |
| `FieldInput` (renders one field definition as the right control)                  | forms, task/problem/person extra fields, review screen      |
| `buildRecordSchema(defs)` in `src/lib/ops` (same Zod schema on client and server) | form submit, custom fields                                  |
| `StepButtons` (next-step buttons from the workflow, phase colors)                 | field tasks, problems, records                              |
| `PhonePreview` (renders a field component at 375 px inside settings)              | steps, fields, forms                                        |
| `BottomBar` (enabled modules only)                                                | field view                                                  |
| `PhaseBadge`                                                                      | everywhere statuses show                                    |

All are built on the existing T2 primitives (`Button`, `Input`, `Select`, `Checkbox`, `Badge`, `Dialog`, `Toast`, `FormField`). No new libraries.

### B9. Dependencies and priorities

| Order | Item                                                     | Depends on  | Why this order                                                                       |
| ----- | -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| 1     | **People and roles management**                          | nothing new | Closes P0 #4; needed before leads, verification or team-scoped modules mean anything |
| 2     | Modules registry + config revisions + Settings hub shell | 1           | Lets every later module plug in and be toggled                                       |
| 3     | Schedule module (+ places editing, directions shown)     | 2           | Closes P0 #8                                                                         |
| 4     | Task creation/assignment after launch                    | 1           | Closes P0 #6                                                                         |
| 5     | Steps (workflow) with phases and "needs a check"         | 2, 4        | Configurable statuses + verification                                                 |
| 6     | Custom fields on tasks/problems/people                   | 2           | First use of `FieldInput` / `buildRecordSchema`                                      |
| 7     | Forms and records                                        | 6           | Situation-specific data capture without code                                         |
| 8     | Updates (announcements)                                  | 2           | P0 field item #3                                                                     |
| 9     | Resources                                                | 2           | P1                                                                                   |
| 10    | Offline (snapshot, outbox, sync of records and steps)    | 5, 7        | Needs stable mutation shapes first                                                   |
| 11    | AI suggestions that output modules, fields and steps     | 2–7         | AI can only fill a schema that exists                                                |

**Risks:** dynamic validation must be the same on client and server (one builder in `src/lib`); renaming or removing fields while records exist (archive, don't delete); custom statuses must never leak into permission logic (phases only); settings changes during a live event need clear "what changed" feedback for field users.

---

## Part C. Recommendation for tonight

**Build "People and roles" (B9 item 1).** One feature, self-contained, about 60–75 minutes including tests:

- Organizer/coordinator screen `/app/ops/[id]/people`: list everyone who joined, with a team dropdown and a role dropdown (shown with this operation's labels), plus **rename the four role labels** after launch.
- Service + API: `PATCH /api/ops/:id/members/:memberId` and `PATCH /api/ops/:id/role-labels`, using the existing permission matrix (coordinators can set only lead/member, nobody can demote the last organizer, labels never affect access).
- Visible effect in the demo: make someone **Hall Supervisor** → they can now respond to and resolve their hall's incidents (already enforced in the service, untested in UI today).
- Tests: Vitest for every permission rule above; one E2E step added to the journey.

Why this one: it closes the most visible P0 gap ("Teams and temporary roles"), it is the base of the configuration engine, it needs no new tables and no migration change, and it cannot destabilise the working lifecycle.

---

## Update 21:15 IST: People and roles (Part C) built

- Screen `/app/ops/[id]/people` (coordinators and organizers): team and role dropdowns per person, saved instantly with a toast and logged; role-name editor (organizer).
- `PATCH /api/ops/:id/members/:memberId`, `PATCH /api/ops/:id/role-labels`.
- Rules (server-side, tested): coordinators can only set `member`/`lead` and cannot change coordinators or organizers; the last organizer cannot be demoted; teams must belong to the operation; labels never change access; read-only after closing.
- Field view: a team lead gets "<problems> in your <team>" with "I'm on it" / "Mark resolved"; place directions now show under "Go to …".
- Verified: `npm run check` 38 files / **265/265**, Playwright **27/27** (journey renames the lead role, promotes the participant, who then responds to their team's incident), formatting clean, People page checked at 375 px.
