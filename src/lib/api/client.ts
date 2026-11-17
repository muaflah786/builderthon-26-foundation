import type { ErrorCode, FieldErrors } from "@/lib/errors";
import type { ApiResponse, PageMeta } from "@/lib/api/types";

/**
 * Typed fetch wrapper for calling our own /api routes from client components.
 *
 *   const thing = await apiFetch<Thing>("/api/things", { method: "POST", body: input });
 *   const { data, meta } = await apiFetchPage<Thing>("/api/things", { query: { page: 2 } });
 *
 * Throws ApiClientError (with .fieldErrors for forms) on any non-ok response.
 */

export class ApiClientError extends Error {
  readonly code: ErrorCode | "NETWORK_ERROR";
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(
    code: ApiClientError["code"],
    message: string,
    status: number,
    fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type QueryValue = string | number | boolean | null | undefined | Array<string | number>;

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /** Serialized as JSON. */
  body?: unknown;
  /** Serialized to the query string; null/undefined/"" values are skipped. */
  query?: Record<string, QueryValue>;
};

export function buildUrl(path: string, query?: ApiFetchOptions["query"]) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(path: string, options: ApiFetchOptions = {}) {
  const { body, query, headers, ...init } = options;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError("NETWORK_ERROR", "Could not reach the server", 0);
  }

  if (res.status === 204) return { ok: true, data: undefined as T } as const;

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError("INTERNAL_ERROR", `Unexpected response (${res.status})`, res.status);
  }

  if (!json.ok) {
    throw new ApiClientError(
      json.error.code,
      json.error.message,
      res.status,
      json.error.fieldErrors,
    );
  }
  return json;
}

/** Returns `data` from a successful response. */
export async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  return (await request<T>(path, options)).data;
}

/** Returns `{ data, meta }` from a paginated list response. */
export async function apiFetchPage<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<{ data: T[]; meta: PageMeta }> {
  const res = await request<T[]>(path, options);
  if (!("meta" in res) || !res.meta) {
    throw new ApiClientError("INTERNAL_ERROR", "Expected a paginated response", 200);
  }
  return { data: res.data, meta: res.meta };
}
