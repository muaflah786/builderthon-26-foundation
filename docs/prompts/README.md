# Claude prompt library

Ten prompts for the competition. Each one works on its own in a **fresh** conversation: copy the block, fill in the `<<...>>` placeholders, paste. Prompts that change code assume Claude Code is opened in this repository (it reads `CLAUDE.md` → `AGENTS.md` automatically).

| #   | Prompt                                                     | Use when                                                         | Changes code?                 |
| --- | ---------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------- |
| 01  | [Master product planning](01-master-product-planning.md)   | Minute 0: turn the problem statement into a plan                 | No                            |
| 02  | [Problem analysis](02-problem-analysis.md)                 | Clarify users, constraints and judging criteria                  | No                            |
| 03  | [Research](03-research.md)                                 | Facts, similar products, APIs, datasets                          | No                            |
| 04  | [Product architecture](04-product-architecture.md)         | Map the product onto this foundation (entities, routes, modules) | No (writes `docs/PRODUCT.md`) |
| 05  | [UI/UX implementation](05-ui-ux-implementation.md)         | Build or polish screens with the design system                   | Yes                           |
| 06  | [Module task generation](06-module-task-generation.md)     | Split the product into parallel tasks for 3 people               | No (writes task files)        |
| 07  | [Claude implementation](07-claude-implementation.md)       | Implement one task / vertical slice                              | Yes                           |
| 08  | [Integration](08-integration.md)                           | Merge branches and verify everything together                    | Yes                           |
| 09  | [Testing & debugging](09-testing-and-debugging.md)         | A bug, a failing test, or a pre-demo test pass                   | Yes                           |
| 10  | [Presentation preparation](10-presentation-preparation.md) | Last hour: demo script, slides, Q&A                              | No                            |

Typical flow: **01 → 02 → (03) → 04 → 06**, then each person runs **07** (and **05** for UI) in their own conversation, one person runs **08** every 60–90 minutes, everyone uses **09** when stuck, and **10** in the last hour.

Rules that apply to every prompt:

- Paste the **actual** problem statement text. Never summarize it from memory.
- One task per conversation. Start a new conversation instead of letting one grow huge.
- Ask Claude to report what it verified and what is UNTESTED, and believe the UNTESTED list.
