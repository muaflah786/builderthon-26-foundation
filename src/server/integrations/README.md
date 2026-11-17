# External API integrations

Recipe: add a new external API (about 10 minutes):

1. Add the key to `src/lib/env.ts` (e.g. `WEATHER_API_KEY: z.string().min(1).optional()`) **and** `.env.example`.
2. Create `src/server/integrations/<service>.ts` with `import "server-only";`.
3. Define a Zod schema for the fields you actually use (not the whole response).
4. Export small typed functions that call `fetchJson(url, { schema, headers })` from `./http.ts`.
5. If the key is missing, throw `new AppError("INTERNAL_ERROR", "<Service> is not configured")`. Don't fake data.
6. Call these functions only from services or route handlers, never from client components (the key would leak).
7. Expensive or paid API behind a public endpoint? Wrap the route with `assertRateLimit` (`src/server/security/rate-limit.ts`).
8. Test with `vi.spyOn(globalThis, "fetch")` (see `http.test.ts`). No real network calls in tests.
