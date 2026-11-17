import { z } from "zod";

/** Shared by the sign-in / sign-up forms. Better Auth re-validates on the server. */

export const emailSchema = z.email("Enter a valid email address").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must be at most 100 characters");

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  // No length rule on sign-in: a wrong password should get the server's generic error.
  password: z.string().min(1, "Password is required").max(128),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const DEFAULT_AFTER_AUTH_PATH = "/app";

/**
 * Sanitizes a `?next=` value so it can only point inside this app (no open redirect).
 * Accepts paths that start with a single "/"; rejects "//host", "/\host", absolute
 * URLs, `javascript:` and anything else, returning the default instead.
 */
export function safeNextPath(
  next: string | string[] | null | undefined,
  fallback: string = DEFAULT_AFTER_AUTH_PATH,
): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Control characters (tabs/newlines are stripped by URL parsers) could smuggle "//".
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
