import { z } from "zod";
import { AppError, isAppError } from "@/lib/errors";
import type { ApiFailure, ApiSuccess, PageMeta } from "@/lib/api/types";

/**
 * Route-handler helpers. Usage (src/app/api/<resource>/route.ts):
 *
 *   export const POST = apiHandler(async (req) => {
 *     const input = await parseJson(req, createThingSchema);
 *     const thing = await thingService.create(input);
 *     return created(thing);
 *   });
 */

const MAX_JSON_BYTES = 1_000_000; // 1 MB — uploads use a separate pattern.

// ---------- success responses ----------

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data } satisfies ApiSuccess<T>, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function paginated<T>(data: T[], meta: PageMeta) {
  return Response.json({ ok: true, data, meta } satisfies ApiSuccess<T[]>);
}

export function noContent() {
  return new Response(null, { status: 204 });
}

// ---------- error responses ----------

export function errorResponse(error: AppError) {
  const body: ApiFailure = {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    },
  };
  return Response.json(body, { status: error.status });
}

/** Converts anything thrown into a safe JSON error response. Never leaks internals. */
export function toErrorResponse(error: unknown) {
  if (isAppError(error)) return errorResponse(error);
  if (error instanceof z.ZodError) {
    return errorResponse(AppError.validation(z.flattenError(error).fieldErrors));
  }
  console.error("[api] Unhandled error:", error);
  return errorResponse(new AppError("INTERNAL_ERROR", "Something went wrong"));
}

// ---------- handler wrapper ----------

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response;

/** Wraps a route handler so every thrown error becomes the standard envelope. */
export function apiHandler<Ctx = unknown>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

// ---------- input parsing ----------

/** Parses and validates a JSON request body. Throws AppError on bad input. */
export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw AppError.badRequest("Expected a JSON body (Content-Type: application/json)");
  }
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_JSON_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  const text = await req.text();
  if (text.length > MAX_JSON_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  let raw: unknown;
  try {
    raw = text.length ? JSON.parse(text) : {};
  } catch {
    throw AppError.badRequest("Malformed JSON body");
  }
  return parseWith(schema, raw);
}

/** Parses URL search params (e.g. ?page=2&q=foo). Repeated keys become arrays. */
export function parseQuery<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const params = new URL(req.url).searchParams;
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }
  return parseWith(schema, raw);
}

/** Validates dynamic route params, e.g. `await parseParams(ctx.params, idParamSchema)`. */
export async function parseParams<S extends z.ZodType>(
  params: Promise<unknown> | unknown,
  schema: S,
): Promise<z.infer<S>> {
  return parseWith(schema, await params);
}

async function parseWith<S extends z.ZodType>(schema: S, raw: unknown): Promise<z.infer<S>> {
  const result = await schema.safeParseAsync(raw);
  if (!result.success) {
    throw AppError.validation(z.flattenError(result.error).fieldErrors);
  }
  return result.data;
}
