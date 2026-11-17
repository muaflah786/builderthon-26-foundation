# T5: Integrations, security extras, logging, deployment

| Path                                 | What                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/logger.ts`               | `logger.debug/info/warn/error(message, context)`: JSON lines in production, readable in dev; `LOG_LEVEL`                         |
| `src/server/integrations/http.ts`    | `fetchJson(url, { schema, method, body, headers, timeoutMs, retries, backoffMs })`                                               |
| `src/server/integrations/README.md`  | Recipe for adding an external API                                                                                                |
| `src/server/security/rate-limit.ts`  | `rateLimit`, `assertRateLimit` (429), `clientIp`, `resetRateLimits`                                                              |
| `src/server/storage/*`               | Optional uploads: `getStorage()` (null when off), `local` + `s3` drivers, validation (MIME allow-list, magic bytes, key pattern) |
| `src/app/api/uploads/route.ts`       | `POST` multipart `file` → 201 `{ key, url, contentType, size }`                                                                  |
| `src/app/api/uploads/[key]/route.ts` | `GET` serves local-driver files (`nosniff`, PDFs as attachment)                                                                  |
| `docs/DEPLOYMENT.md`                 | Vercel + Turso, Node host, R2 uploads, rollback                                                                                  |
| `src/lib/env.ts`                     | `LOG_LEVEL`, `STORAGE_DRIVER`, `UPLOAD_MAX_BYTES`, `S3_*` (required together when `STORAGE_DRIVER=s3`)                           |

## Decisions

- **No AWS SDK.** The S3 driver signs requests itself (about 100 lines of SigV4). The signer is verified against AWS's published test vector, which avoids a multi-megabyte dependency.
- **The declared upload type is not trusted.** The file's magic bytes must match the declared type. SVG/HTML are never accepted, keys are server-generated UUIDs, and served files get `nosniff`.
- **Uploads are off by default.** The route returns 404 until `STORAGE_DRIVER` is set.
- **No Dockerfile.** It isn't needed for either deploy path, and Docker isn't installed. The DEPLOYMENT.md "Docker" note explains how to add one.

## Verified

- Unit: `http.test.ts` (success, retry, give-up, no retry for POST/4xx, timeout, schema mismatch without leaking), `rate-limit.test.ts`, `s3.test.ts` (AWS vector), `storage.test.ts`, `uploads/route.test.ts`, `uploads/disabled.test.ts`.
- Manual over real HTTP (dev server, `STORAGE_DRIVER=local`): 401 signed out, 201 + served as `image/png`, 422 `.exe`, 413 for 6 MB.

## UNTESTED

- S3/R2 upload against a real bucket (no credentials).
- Vercel + Turso deployment (no accounts connected).
