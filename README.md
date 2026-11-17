# Builderthon '26 Foundation

A reusable full-stack starter for the DARUL HUDA SIBĀQ'26 Builderthon. It is **not** a product. It provides infrastructure and patterns so that, when the problem statement arrives, we only build the solution.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM + SQLite/libSQL (Turso in production) · Zod 4 · Better Auth · Vitest · Playwright.
Why each was chosen: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start (Windows/macOS/Linux, Node ≥ 22)

```bash
npm install
cp .env.example .env.local
npm run db:migrate      # creates ./local.db (no Docker, no DB server needed)
npm run db:seed         # demo login: demo@example.com / demo-password-123
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
| `npm run new-resource -- task tasks`                   | generate a full CRUD resource from the reference slice      |
| `npm run db:studio` / `db:seed`                        | browse data / insert seed data                              |

## Documentation

| Doc                                                                                 | Read when                                                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [QUICKSTART](docs/QUICKSTART.md)                                                    | **Competition day: the one-page plan**                                        |
| [Prompt library](docs/prompts/README.md)                                            | 10 ready-to-paste Claude prompts                                              |
| [COMPETITION_ADAPTATION_GUIDE](docs/COMPETITION_ADAPTATION_GUIDE.md)                | the problem statement has arrived: adapt the foundation                       |
| [T6 AI assistant](docs/T6_ARCHITECTURE.md)                                          | the website AI assistant (setup, providers, knowledge, integration, security) |
| [ARCHITECTURE](docs/ARCHITECTURE.md)                                                | understanding the layers and folders                                          |
| [MODULE_CONTRACTS](docs/MODULE_CONTRACTS.md)                                        | before using or changing a shared interface                                   |
| [API_GUIDE](docs/API_GUIDE.md)                                                      | writing or calling an `/api` route                                            |
| [DATABASE_GUIDE](docs/DATABASE_GUIDE.md)                                            | adding tables, migrations, seeds                                              |
| [TESTING_GUIDE](docs/TESTING_GUIDE.md)                                              | writing tests                                                                 |
| [SECURITY_CHECKLIST](docs/SECURITY_CHECKLIST.md)                                    | before merging / deploying                                                    |
| [TASK_OWNERSHIP](docs/TASK_OWNERSHIP.md) + [docs/tasks/](docs/tasks/)               | running parallel task conversations                                           |
| [WINDOWS_SETUP](docs/WINDOWS_SETUP.md)                                              | installing tools on a new laptop                                              |
| [ENVIRONMENT](docs/ENVIRONMENT.md)                                                  | environment variables and external services                                   |
| [DEPLOYMENT](docs/DEPLOYMENT.md)                                                    | deploying (Vercel + Turso, Node host)                                         |
| [TEST_REPORT](docs/TEST_REPORT.md) / [KNOWN_LIMITATIONS](docs/KNOWN_LIMITATIONS.md) | what is verified, what isn't, contingency plans                               |
| [INTEGRATION_STATUS](docs/INTEGRATION_STATUS.md)                                    | what is verified right now                                                    |

## What's included

Email/password auth with roles · protected `/app` area · design system + forms + toasts/dialogs · reference CRUD resource with search/filter/sort/pagination · resource generator · demo seed data · structured logging · external-API helper · rate limiting · optional uploads (local/S3) · Vitest + Playwright + CI · deployment guide.

A sample product built from it lives on branch `sample/notes-app`.

## Status

All modules are merged and verified: 149 unit/integration tests, 14 browser tests, CI on GitHub, and a live production deployment (Vercel + Turso, Mumbai). See [DEPLOYMENT_REPORT](docs/DEPLOYMENT_REPORT.md) and [INTEGRATION_STATUS](docs/INTEGRATION_STATUS.md).
