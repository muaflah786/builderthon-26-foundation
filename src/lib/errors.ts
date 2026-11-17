/**
 * Application error contract (see docs/MODULE_CONTRACTS.md §Errors).
 * Throw `AppError` from services and route handlers; the API wrapper converts it
 * to the standard JSON error envelope. Never throw raw strings.
 */

export const ERROR_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  /** A required external service (e.g. the AI provider) is not configured or unavailable. */
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

/** Field name -> list of messages. Matches z.flattenError(...).fieldErrors. */
export type FieldErrors = Record<string, string[] | undefined>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.fieldErrors = fieldErrors;
  }

  static badRequest(message = "Bad request") {
    return new AppError("BAD_REQUEST", message);
  }
  static unauthenticated(message = "You must be signed in") {
    return new AppError("UNAUTHENTICATED", message);
  }
  static forbidden(message = "You do not have permission to do that") {
    return new AppError("FORBIDDEN", message);
  }
  static notFound(resource = "Resource") {
    return new AppError("NOT_FOUND", `${resource} not found`);
  }
  static conflict(message = "Conflict") {
    return new AppError("CONFLICT", message);
  }
  static validation(fieldErrors: FieldErrors, message = "Validation failed") {
    return new AppError("VALIDATION_ERROR", message, fieldErrors);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
