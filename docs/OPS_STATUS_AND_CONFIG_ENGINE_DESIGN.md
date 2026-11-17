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
| 6   | Task creation and assignment         | **Fully implemented** (21:33)    | Create, edit, reassign after launch to a team and/or person, with team-scoped visibility, history and stale-edit protection (Vitest + E2E). Verification and stuck states are separate rows (#7)                                    |
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

---

# Part D. Team Management and Task Management 2.0 (design, 21:25 IST)

> **Design only. Nothing in Part D is implemented.** Builds on commit `03bb770`.
> Both systems are generic: no scenario-specific logic in services or screens. All words come from
> `operation.config.terms`; the universality guard test keeps covering the new files.

## D0. Review of People and roles (`03bb770`)

| Finding                                                                                                             | Severity                             | Decision                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| "Last organizer" check is count-then-update. Two organizers demoting each other at the same moment could leave none | Low (needs two simultaneous actions) | Fix in stage T2-A: do the demotion as a conditional update inside the transaction and check the affected row count |
| Moving a person to another team silently keeps their active tasks assigned to them                                  | Medium (surprising, not unsafe)      | Make it an explicit choice on the move (D3)                                                                        |
| Lead rights come from level + team at request time, so changes apply immediately                                    | Good                                 | Keep. All team scoping in Part D builds on this                                                                    |

No blocking bugs found. Verified state: check 265/265, Playwright 27/27.

## D1. Team Management specification

**Goal:** organizers and coordinators can shape teams while the operation runs, without losing history.

| Capability            | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create team           | Name (required, unique among active teams in the operation), "What this team does" (optional), place (optional). Logged                                                                                                                                                                                                                                                                                                                     |
| Rename / edit         | Same fields. History keeps the old name because activity entries store their text when written; a "renamed X to Y" entry is added                                                                                                                                                                                                                                                                                                           |
| See members and leads | Team page lists leads first, then members, with each person's active task count                                                                                                                                                                                                                                                                                                                                                             |
| Assign or change lead | "Make lead" on a member of the team (sets level `lead`); "Make member" removes it. **Several leads are allowed** (shift changes); a team with no lead shows a warning, not an error                                                                                                                                                                                                                                                         |
| Move people           | From the team page ("Add people": pick from people not in this team) or from People. If the person has active tasks in the old team, ask once: **"Hand their tasks back to the old team"** (default) or **"Keep their tasks with them"**                                                                                                                                                                                                    |
| Remove (archive)      | Never a hard delete. Shows what still depends on the team and requires a decision for each non-zero item: open tasks (move to team X / leave with no team / cancel), people (move to team X / no team), open problems (move to team X / keep; coordinators still see them). One transaction; then `archived_at` is set, the team disappears from pickers, join page and field views, and stays in summaries and exports as "name (removed)" |
| Restore               | Organizer can restore an archived team (P1, cheap: clear `archived_at`)                                                                                                                                                                                                                                                                                                                                                                     |

**Rules:** organizers and coordinators manage teams; coordinators still cannot change coordinators or organizers. Leads can view their own team page but not edit it. Archived teams reject new tasks, joins and moves into them (server-side).

## D2. Task Management 2.0 specification

**Goal:** tasks can be created and steered at any time, with clear states, optional checking and a full history. The field experience stays one obvious button.

### States (fixed engine phases; display labels can become configurable later, B1)

| State (internal) | Field label                       | Meaning                                                                   | Primary action for the person doing it                    |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| `todo`           | Waiting                           | Not started                                                               | **Start**                                                 |
| `in_progress`    | In progress                       | Someone is on it                                                          | **Mark as completed**; secondary "I'm stuck", "Hand back" |
| `blocked`        | Stuck                             | Can't continue; reason required                                           | **Continue** (back to in progress)                        |
| `done`           | Completed, or "Waiting for check" | Finished; if it needs a check it stays "Waiting for check" until verified | none (lead sees **Approve** / **Send back**)              |
| `cancelled`      | Cancelled                         | No longer needed; reason optional                                         | none                                                      |

Allowed transitions (server-enforced):

```
todo --start--> in_progress --complete--> done --verify--> done (verified)
  ^               |   ^   |                  |
  +--hand back----+   |   +--stuck--> blocked +--send back (note)--> in_progress
                      +--continue-----+
any open state --cancel--> cancelled --reopen--> todo
```

### Capabilities

| Capability          | Behaviour                                                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create after launch | Title (required), instructions, team, person (optional, filtered to that team), place, due time, "Important", "Needs a check when done"                                                                                                                                        |
| Assign              | To a team (anyone in it can take it), to a person (only they can start it), or both. The person must be a member of the operation; the team must not be archived                                                                                                               |
| Edit                | All fields while open. Every write increments `version`; a stale edit gets "Someone changed this just now" (existing optimistic check)                                                                                                                                         |
| Progress            | Start, complete (optional note), stuck (reason), continue, hand back, cancel (reason), reopen                                                                                                                                                                                  |
| Verification        | If "Needs a check": after completion, a lead of the task's team or a coordinator+ approves or sends back with a note. **Never the person who completed it.** Unverified completions count as completed but are listed as "waiting for check" in the command centre and summary |
| History             | Each task page shows its own timeline from the activity log (who, what, when, from/to)                                                                                                                                                                                         |
| Command centre      | "Needs attention" gains **Stuck tasks** and **Waiting for check**; lists show reason/age and one-click actions                                                                                                                                                                 |

## D3. How teams and tasks work together

| Situation                    | What happens                                                                                                                                                                                                                                                                                                                          | Why                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Person moves to another team | Waiting (unclaimed) tasks of the old team disappear from their view immediately. Their **active** tasks are by default handed back to the old team (`todo`, unassigned); if the mover chose "keep with them", they stay assigned and the person sees only those, not the old team's pool. Problems they reported stay in "My reports" | No accidental access; no silently orphaned work |
| Lead changes                 | Lead rights are checked from level + team on every request, so the new lead immediately sees the team's problems and pending checks and the old lead loses them                                                                                                                                                                       | One source of truth                             |
| Lead moves away              | Same; if the team now has no lead, team page and command centre show "No lead"                                                                                                                                                                                                                                                        | Visible, not blocking                           |
| Team renamed                 | Ids unchanged; screens show the new name; old activity text keeps the old name; one "renamed" entry                                                                                                                                                                                                                                   | History stays truthful                          |
| Team archived                | Only after the explicit decisions in D1. Completed tasks keep pointing at the archived team so summaries stay accurate                                                                                                                                                                                                                | Nothing lost or misattributed                   |
| Task moved to another team   | Allowed while open; if it was assigned to someone outside the new team, the assignment is cleared unless the coordinator explicitly keeps it                                                                                                                                                                                          | Members only ever see their own team's pool     |

**Visibility rule (one function used by every task and problem query):**

- Organizer, coordinator: everything in the operation.
- Lead: their team's tasks and problems, plus tasks assigned to them.
- Member: tasks assigned to them, waiting unassigned tasks of their team (or with no team when they have none), problems they reported.
- Computed from the member's **current** level and team on each request. Nothing is cached in the browser beyond the current page.

## D4. Combined data model

Reuses `ops_teams`, `ops_tasks`, `ops_members`, `ops_activity`. No new tables.

| Table                         | Change                                                                                                                                                                  | Purpose                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `ops_teams`                   | + `archived_at`, `archived_by_member_id`                                                                                                                                | Safe removal                                             |
| `ops_tasks`                   | + `requires_verification`, `verified_at`, `verified_by_member_id`, `completed_by_member_id`, `blocked_reason`, `blocked_at`, `cancelled_reason`, `created_by_member_id` | States, checking, accountability                         |
| `ops_activity`                | + `data` (JSON: from, to, field, reason)                                                                                                                                | Structured history; the existing `summary` text stays    |
| `operations.config.attention` | accepts `blocked_tasks`, `awaiting_check`                                                                                                                               | Defaults appended on read for operations created earlier |

New indexes: `ops_tasks(operation_id, team_id)`, `ops_tasks(operation_id, assignee_member_id)`, `ops_activity(operation_id, entity_id)`.

**Migration:** nothing has been merged to `main` yet, so these columns only change the **local, uncommitted** `0002_ops` migration (delete, `db:generate`, still exactly one pending migration, no drop-and-create). **This needs your approval** because it modifies migration files (local only). Production is untouched until the merge.

### API (all `apiHandler` + Zod + `requireMember`)

| Endpoint                                     | Body                                                                                                                  | Who                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `GET /api/ops/:id/teams`                     | none                                                                                                                  | coordinator+; lead sees own     |
| `POST /api/ops/:id/teams`                    | name, purpose?, locationId?                                                                                           | coordinator+                    |
| `PATCH /api/ops/:id/teams/:teamId`           | name?, purpose?, locationId?                                                                                          | coordinator+                    |
| `GET /api/ops/:id/teams/:teamId/impact`      | none; returns counts of open tasks, people, open problems                                                             | coordinator+                    |
| `POST /api/ops/:id/teams/:teamId/archive`    | tasksTo, peopleTo, issuesTo (required when the matching count > 0)                                                    | organizer                       |
| `PATCH /api/ops/:id/members/:mid`            | existing fields + `activeTasks: "handBack" or "keep"` when moving                                                     | existing rules                  |
| `POST /api/ops/:id/tasks`                    | title, instructions?, teamId?, assigneeMemberId?, locationId?, dueAt?, priority, requiresVerification                 | coordinator+; lead for own team |
| `PATCH /api/ops/:id/tasks/:taskId`           | editable fields + `expectedVersion`                                                                                   | coordinator+; lead for own team |
| `POST /api/ops/:id/tasks/:taskId`            | `action` (start, complete, stuck, continue, release, cancel, reopen, verify, send_back), note/reason, expectedVersion | per D5                          |
| `GET /api/ops/:id/tasks?state&teamId&q&page` | none                                                                                                                  | visibility rule (D3)            |

Errors: 404 outside visibility; 403 inside visibility when the action isn't allowed (clear message); 409 for stale version or wrong state ("This task was already completed"); 422 field errors for forms.

## D5. Permission matrix (fixed levels only)

| Action                               |           Organizer            |      Coordinator       |         Lead         |               Member                |
| ------------------------------------ | :----------------------------: | :--------------------: | :------------------: | :---------------------------------: |
| View teams overview / any team page  |              yes               |          yes           |       own team       |                 no                  |
| Create, rename, edit team            |              yes               |          yes           |          no          |                 no                  |
| Remove team (with reassignment)      |              yes               |           no           |          no          |                 no                  |
| Make/remove lead, move people        |              yes               | members and leads only |          no          |                 no                  |
| Create / edit / assign task          |              yes               |          yes           |       own team       |                 no                  |
| Start task                           |              yes               |          yes           | own team or assigned | assigned, or unassigned in own team |
| Complete, stuck, continue, hand back |         yes (anyone's)         |     yes (anyone's)     |      own tasks       |              own tasks              |
| Cancel, reopen                       |              yes               |          yes           |       own team       |                 no                  |
| Verify / send back                   |              yes               |          yes           |       own team       |                 no                  |
| Verify own completion                |             never              |         never          |        never         |                never                |
| View task history                    | if the task is visible to them |                        |                      |                                     |

## D6. Screens

Rules for every screen: one primary button; the title says what you can do; empty states say what to do next ("No teams yet. Create the first one."); loading uses the existing spinner in the area that loads; errors appear next to the field (422) or as a toast (409, with a "Refresh" hint when stale); success is a short toast; **permission denied inside an operation** is a plain sentence ("Only the organizer can remove a team") and the control is not offered in the first place; outside visibility it is the standard "Page not found" (no existence leaks). All nouns come from the operation's vocabulary.

| Screen                 | Route                                | Desktop / tablet                                                                                                                                                                                                                      | Mobile                                                      |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Teams overview**     | `/app/ops/[id]/teams`                | Title "{Teams}" + primary **New {team}**. One list: name, leads (or "No lead" warning), people, progress done/total, "2 late, 1 stuck" in danger color only when non-zero. Removed teams collapsed under "Removed"                    | One row per team, numbers on the right                      |
| **Team details**       | `/app/ops/[id]/teams/[teamId]`       | Title, purpose, place. Actions: **Add people** (primary), Edit, Remove. Two columns: People (leads first; Make lead / Make member; active task count) and Work (Waiting, In progress, Stuck, Waiting for check, Done) + open problems | Single column; the state filter becomes a segmented control |
| **Create / edit team** | dialog (existing `Dialog`)           | Name, What this team does, Place. Save                                                                                                                                                                                                | Full-height sheet                                           |
| **Remove team**        | dialog                               | "Before removing {team}": one choice row per non-zero dependency (another team / no team / cancel them). **Remove team** stays disabled until each is decided                                                                         | Same                                                        |
| **Task overview**      | `/app/ops/[id]/tasks`                | Title + **New {task}**. Segmented filter: All, Waiting, In progress, Stuck, Waiting for check, Done; team select; search. Rows: title, team and person, due (red when late), state pill. Existing `Pagination`                        | Filters as horizontally scrolling chips; rows stack         |
| **Task details**       | `/app/ops/[id]/tasks/[taskId]`       | Title, state pill, "Important". Facts: team, person, place, due, created by. Instructions. **One primary action** for this viewer and state, quieter secondary actions. History timeline at the bottom                                | Primary action sticky at the bottom                         |
| **Create / edit task** | `/tasks/new`, `/tasks/[taskId]/edit` | Title, Instructions, Team, Person (filtered; "Anyone in the team"), Place, Due, Important, Needs a check. Save returns to the task                                                                                                    | Full-screen form, Save sticky                               |
| **Mobile field tasks** | existing field view                  | Same structure. Each card shows its state pill and the one button for that state. "I'm stuck" opens a one-field reason sheet. Completed-needing-check shows "Waiting for check". Leads get a "To check" list above My tasks           | —                                                           |
| **Command centre**     | existing                             | Needs-attention line adds "N stuck" and "N waiting for check". Lists: Stuck (reason, who, since), Waiting for check (Approve / Send back), Late. Header links to {Teams} and {Tasks}. Team rows link to Team details                  | —                                                           |

## D7. Reusable components (all on existing T2 primitives)

`StatePill` (task states) · `TaskRow` (overview, team page, command centre) · `TaskPrimaryAction` (chooses the single button from state + permissions; used by field cards and Task details) · `ReasonDialog` (stuck, cancel, send back) · `TeamPicker` / `PersonPicker` (native `Select`, filtered) · `ChoiceRow` (reassignment decisions) · `Timeline` (task history and summary) · `SegmentedFilter` (URL-driven like `Pagination`). Permission helpers stay in `src/lib/ops/permissions.ts` (`canSeeTask`, `canEditTask`, `canVerify`, `canManageTeam`, `canArchiveTeam`) so the UI and the server use the same rules.

## D8. Implementation sequence and estimates

| Stage | Scope                                                                                                                              | Estimate |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| T2-A  | Schema additions + local migration regeneration (needs approval) + activity `data` + visibility helper + atomic last-organizer fix | 20 min   |
| T2-B  | **Create / edit / assign tasks after launch** + Task overview + Task details with history (current states)                         | 70 min   |
| T2-C  | Stuck / continue / cancel / reopen + command-centre signals                                                                        | 35 min   |
| T2-D  | Verification (approve / send back, never own)                                                                                      | 35 min   |
| TM-A  | Teams overview + details + create/rename + make lead + add people                                                                  | 60 min   |
| TM-B  | Move-with-active-tasks choice + remove team with reassignment                                                                      | 50 min   |

Total about 4.5 hours including tests. Order: T2-A, T2-B, T2-C, TM-A, T2-D, TM-B (task creation and stuck states give the most demo value first; team removal is the riskiest and least visible, so last). Each stage ends with check, build and Playwright green.

## D9. Risks and testing strategy

| Risk                                                   | Mitigation                                                        | Test                                                                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A team change exposes another team's tasks or problems | One visibility function used by every query, computed per request | Vitest matrix: member and lead before/after move, lead change, archive. E2E: moved person no longer sees the old team's pool |
| Losing or misattributing work when a team is removed   | Required decisions, one transaction, soft delete                  | Vitest: archive refuses without decisions (409 with counts); totals unchanged afterwards                                     |
| Self-verification                                      | Server compares `completed_by_member_id`                          | Vitest                                                                                                                       |
| Stale edits or double actions                          | `version` check on every task write; `expectedVersion` from forms | Vitest: second writer gets 409                                                                                               |
| Older operations lack the new attention signals        | Defaults appended on read                                         | Vitest with an old-style config                                                                                              |
| Running out of time tonight                            | Independent stages, each ending green                             | check, build, Playwright after each stage                                                                                    |
| Universality                                           | No situation ids in new files                                     | Existing guard test extended to the new paths                                                                                |

E2E additions: coordinator creates a task for a team after launch, a member of that team starts it, gets stuck with a reason, the command centre shows it, the coordinator unblocks it; a task that needs a check is completed by a member and approved by the lead (the member cannot approve it); a team is created, a person moved, and the old team's pool is no longer visible to them.

## D10. Recommendation

**Build T2-A + T2-B first: create, edit and assign tasks after launch, with Task overview and Task details (with history).** Realistic estimate: **about 90 minutes including tests.** It is now about 21:25, so it fits before 23:00 with a buffer for verification.

Why first: it closes the largest remaining P0 gap (#6); it is the most visible change in a demo (a problem comes in, the coordinator creates a task for a team in seconds, and it appears on that team's phones); and the visibility helper it introduces is what Team Management builds on.

**Approval needed before starting:** regenerating the local, uncommitted `0002_ops` migration for the new columns (T2-A). No committed migration files change; nothing is pushed or deployed.

---

## Update 21:33 IST: stages T2-A and T2-B built

**Implemented**

- **T2-A:** new columns on `ops_teams` (`archived_at`, `archived_by_member_id`), `ops_tasks` (`completed_by_member_id`, `created_by_member_id`, `requires_verification`, `verified_at`, `verified_by_member_id`, `blocked_reason`, `blocked_at`, `cancelled_reason`) and `ops_activity` (`data` JSON), plus the three indexes from D4. The local, uncommitted `0002_ops` migration was regenerated (approved; still exactly one pending migration). The single visibility rule `canSeeTask` (+ its SQL form in the task service). The "last organizer" demotion is now an atomic conditional update.
- **T2-B:** create, edit and reassign tasks after launch (`POST /api/ops/:id/tasks`, `PATCH /api/ops/:id/tasks/:taskId` with `expectedVersion`); Task overview with state filters and counts (All, Waiting, In progress, Late, Completed), team filter, search and pagination; Task details with facts, the one next action, "Edit or reassign", and the task's own history; links from the command centre ("{Tasks}") and, for leads, from the field view; task titles in the field view open the details.
- Rules (server-side, tested): coordinators+ anything; leads only their own team and people in it; members can't create or open the overview; references must belong to the operation and teams must not be archived; reassigning a started task puts it back to waiting; moving a task to another team clears a person who isn't in it; stale edits get 409; finished tasks can't be edited; read-only after closing.

**Not yet (later stages):** stuck/continue/cancel/reopen (T2-C), verification (T2-D, columns exist, no UI), team management screens (TM-A/TM-B). The "Needs a check" option is deliberately **not** shown in the form until T2-D works.

**Verified:** `npm run check` 39 files / **280/280** (15 new task tests incl. the visibility matrix), Playwright **27/27** (the journey now creates a duty for Hall 1 after launch and the Hall 1 participant receives it), formatting clean, Task overview and New task checked at 375 px with no page-level horizontal scroll.
