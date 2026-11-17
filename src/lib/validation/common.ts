import { z } from "zod";
import type { PageMeta } from "@/lib/api/types";

/**
 * Reusable Zod building blocks. Resource-specific schemas live in
 * src/lib/validation/<resource>.ts and are shared by forms AND route handlers.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Route param `[id]`. Ids are text (crypto.randomUUID) — see docs/DATABASE_GUIDE.md. */
export const idParamSchema = z.object({ id: z.string().min(1).max(64) });

/** Trims and converts "" to undefined — use for optional text inputs from forms. */
export const optionalText = (max = 1000) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

/**
 * Standard list query: ?page=1&pageSize=20&q=search&sort=createdAt&order=desc
 * Build a resource-specific version with `listQuerySchema(["createdAt", "title"])`
 * and `.extend({...filters})` for filters.
 */
export function listQuerySchema<const S extends readonly [string, ...string[]]>(
  sortFields: S,
  defaultSort: S[number] = sortFields[0],
) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    q: optionalText(200),
    sort: z.enum(sortFields).default(defaultSort as never),
    order: z.enum(["asc", "desc"]).default("desc"),
  });
}

export function pageMeta(total: number, page: number, pageSize: number): PageMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function pageOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}
