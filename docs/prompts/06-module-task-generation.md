# 06: Module task generation

```text
Split our product into independent tasks for 3 people working in parallel conversations.

Read: AGENTS.md, docs/PRODUCT.md, docs/TASK_OWNERSHIP.md, docs/tasks/_COMMON.md and the
existing task prompts in docs/tasks/ as the format to follow.

Hours left: <<HOURS>>. Team: <<names and strengths>>.

Produce:
1. A task table: id, name, owner, branch (task/<slug>), depends on, estimated hours.
   Split by VERTICAL SLICE (one entity/feature end to end: schema → service → API → UI →
   tests), not by layer. 3–6 tasks total. The first wave must be startable immediately.
2. A strict file-ownership map: every path owned by exactly one task. Shared files
   (src/config/site.ts, src/lib/env.ts, .env.example, src/server/db/seed.ts,
   package.json, drizzle/) stay with the integrator; tasks request changes in their report.
3. One prompt file per task in docs/tasks/<id>-<slug>.md with: objective, owned paths,
   must-not-modify, dependencies, exact contracts (schemas, endpoints, DTO shapes),
   acceptance criteria (checkable), tests to write, and the completion report format
   from _COMMON.md.
4. The merge order and what the integrator checks after each merge.

Update docs/TASK_OWNERSHIP.md for the competition tasks. Do not implement features.
```
