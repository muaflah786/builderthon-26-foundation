import { apiHandler } from "@/lib/api/server";
import { AppError } from "@/lib/errors";
import { getLocalStorage } from "@/server/storage";
import { UPLOAD_KEY_PATTERN, contentTypeForKey } from "@/server/storage/validation";

/**
 * GET /api/uploads/:key — serves files for the LOCAL driver only (development).
 * With S3, files are served from S3_PUBLIC_URL instead. Keys are unguessable
 * UUIDs, so access is "anyone with the link" (like a public bucket).
 */
export const GET = apiHandler(async (_req, ctx: RouteContext<"/api/uploads/[key]">) => {
  const storage = getLocalStorage();
  const { key } = await ctx.params;
  if (!storage || !UPLOAD_KEY_PATTERN.test(key)) throw AppError.notFound("File");

  const bytes = await storage.read(key);
  const type = contentTypeForKey(key);
  if (!bytes || !type) throw AppError.notFound("File");

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(bytes.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": type === "application/pdf" ? "attachment" : "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
});
