import type { ErrorCode, FieldErrors } from "@/lib/errors";

/**
 * JSON envelope returned by EVERY route under /api (except /api/auth/*, which
 * belongs to the auth library). Shared by server and client — do not change
 * without updating docs/API_GUIDE.md.
 */

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  /** Present on paginated list responses. */
  meta?: PageMeta;
};

export type ApiErrorBody = {
  code: ErrorCode;
  message: string;
  /** Present on VALIDATION_ERROR: per-field messages for forms. */
  fieldErrors?: FieldErrors;
};

export type ApiFailure = {
  ok: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
