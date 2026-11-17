# Builderthon '26 Foundation

A reusable full-stack starter for the DARUL HUDA SIBĀQ'26 Builderthon. It is **not** a product. It provides infrastructure and patterns so that, when the problem statement arrives, we only build the solution.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM + SQLite/libSQL (Turso in production) · Zod 4 · Better Auth · Vitest · Playwright.
Why each was chosen: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start (Windows/macOS/Linux, Node ≥ 22)

```bash
npm install
cp .env.example .env.local
npm run db:migrate      # creates ./local.db (no Docker, no DB server needed)
npm run db:seed
npm run dev             # http://localhost:3000  ·  health: /api/health
```

## Scripts

| Command                                                | What it does                                                |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `npm run dev`                                          | dev server with hot reload                                  |
| `npm run build` / `npm start`                          | production build / serve it                                 |
| `npm run check`                                        | typecheck + lint + unit tests (**run before every commit**) |
| `npm test` / `npm run test:watch` / `npm run test:e2e` | Vitest once / watch / Playwright                            |
| `npm run format`                                       | Prettier                                                    |
| `npm run db:push`                                      | dev-only: sync schema to local.db instantly                 |
| `npm run db:generate` / `db:migrate`                   | create / apply SQL migrations                               |
| `npm run db:studio` / `db:seed`                        | browse data / insert seed data                              |

## Documentation

| Doc                                                                   | Read when                                   |
| --------------------------------------------------------------------- | ------------------------------------------- |
| [COMPETITION_ADAPTATION_GUIDE](docs/COMPETITION_ADAPTATION_GUIDE.md)  | **The problem statement has arrived**       |
| [ARCHITECTURE](docs/ARCHITECTURE.md)                                  | understanding the layers and folders        |
| [MODULE_CONTRACTS](docs/MODULE_CONTRACTS.md)                          | before using or changing a shared interface |
| [API_GUIDE](docs/API_GUIDE.md)                                        | writing or calling an `/api` route          |
| [DATABASE_GUIDE](docs/DATABASE_GUIDE.md)                              | adding tables, migrations, seeds            |
| [TESTING_GUIDE](docs/TESTING_GUIDE.md)                                | writing tests                               |
| [SECURITY_CHECKLIST](docs/SECURITY_CHECKLIST.md)                      | before merging / deploying                  |
| [TASK_OWNERSHIP](docs/TASK_OWNERSHIP.md) + [docs/tasks/](docs/tasks/) | running parallel task conversations         |
| [INTEGRATION_STATUS](docs/INTEGRATION_STATUS.md)                      | what is verified right now                  |

## Status

Stage 1 (core config, API contracts, DB layer, tests) is verified. Auth, UI kit, reference resource, testing infrastructure and deployment are in progress. See [INTEGRATION_STATUS](docs/INTEGRATION_STATUS.md).
