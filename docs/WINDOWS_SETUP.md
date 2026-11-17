# Windows setup (each team member, once, before the competition)

Verified on Windows 11 with Node 24.18 / npm 11.16 / Git 2.55. Allow about 20 minutes and a decent internet connection (about 600 MB of downloads).

## 1. Install the tools

| Tool                                    | Required      | Install                                                                                              | Check                       |
| --------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| **Node.js 22 LTS or 24**                | yes           | https://nodejs.org (LTS installer) or `winget install OpenJS.NodeJS.LTS`                             | `node -v` (≥ 22) · `npm -v` |
| **Git for Windows** (includes Git Bash) | yes           | https://git-scm.com/download/win or `winget install Git.Git`                                         | `git --version`             |
| **VS Code**                             | recommended   | `winget install Microsoft.VisualStudioCode`; extensions: ESLint, Prettier, Tailwind CSS IntelliSense | —                           |
| **Claude Code / Claude desktop app**    | recommended   | https://claude.com/claude-code                                                                       | —                           |
| Chromium for Playwright                 | yes (for E2E) | `npx playwright install chromium` inside the project                                                 | `npx playwright --version`  |
| GitHub CLI `gh`                         | optional      | `winget install GitHub.cli`                                                                          | `gh --version`              |
| Vercel CLI                              | optional      | `npm i -g vercel` (the web dashboard is enough)                                                      | `vercel --version`          |
| Turso CLI                               | optional      | needs WSL on Windows; use the web dashboard instead                                                  | —                           |

**Not needed:** Docker, PostgreSQL, Redis, Python, pnpm/yarn. The database is a local SQLite file.

## 2. Configure Git once

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Line endings: the repo's `.gitattributes` forces LF, so `core.autocrlf` settings don't matter.

## 3. Get the project running

```bash
git clone <repo-url> builderthon && cd builderthon     # or copy the folder
npm ci                                                   # exact versions from package-lock.json
cp .env.example .env.local                               # PowerShell: Copy-Item .env.example .env.local
npm run db:migrate
npm run db:seed                                          # demo login: demo@example.com / demo-password-123
npx playwright install chromium
npm run check                                            # should end with all tests passing
npm run dev                                              # http://localhost:3000
```

## 4. Troubleshooting

| Problem                                             | Fix                                                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm warn allow-scripts ... esbuild` during install | Harmless. esbuild ships its binary as an optional package; everything was verified with these warnings present.                    |
| `Port 3000 is in use`                               | Another dev server is running. Close it, or use `npx next dev -p 3001` and set `APP_URL=http://localhost:3001` in `.env.local`.    |
| `Invalid environment variables` on start            | Read the printed field. `npm start` runs in **production** mode, which requires a real `BETTER_AUTH_SECRET` (not the placeholder). |
| Sign-in fails with `INVALID_ORIGIN` / 403           | `APP_URL` must match the URL in the browser exactly (host **and** port).                                                           |
| `no such table: ...`                                | `npm run db:migrate`. If the DB is messy: delete `local.db`, then `npm run db:migrate && npm run db:seed`.                         |
| `npm run db:push` waits for input                   | It asks for confirmation (strict mode). Run it in a real terminal, or use `db:generate` + `db:migrate`.                            |
| E2E fails right after `npm run dev`                 | E2E rebuilds `.next/`. Stop the dev server first.                                                                                  |
| PowerShell blocks `npx` scripts                     | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use Git Bash.                                                            |
| Antivirus makes installs very slow                  | Exclude the project folder from real-time scanning (ask the machine owner).                                                        |
