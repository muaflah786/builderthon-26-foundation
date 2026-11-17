import { apiHandler, created } from "@/lib/api/server";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import { logger } from "@/server/logger";
import { assertRateLimit } from "@/server/security/rate-limit";
import { getStorage } from "@/server/storage";
import {
  ALLOWED_UPLOAD_TYPES,
  isAllowedType,
  matchesMagicBytes,
  newUploadKey,
} from "@/server/storage/validation";

/** Multipart overhead allowance on top of the file size limit. */
const MULTIPART_SLACK = 64 * 1024;

/**
 * POST /api/uploads (multipart/form-data, field "file") → 201 { key, url, contentType, size }.
 * 404 when uploads are disabled (STORAGE_DRIVER unset).
 */
export const POST = apiHandler(async (req) => {
  const storage = getStorage();
  if (!storage) throw AppError.notFound("Uploads");

  const user = await requireUser();
  assertRateLimit({ key: `upload:${user.id}`, limit: 20, windowMs: 60_000 });

  const tooLarge = () =>
    new AppError(
      "PAYLOAD_TOO_LARGE",
      `File is too large (max ${Math.floor(env.UPLOAD_MAX_BYTES / 1024 / 1024)} MB)`,
    );
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > env.UPLOAD_MAX_BYTES + MULTIPART_SLACK) throw tooLarge();

  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    throw AppError.badRequest("Expected multipart/form-data with a 'file' field");
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw AppError.badRequest("Malformed multipart body");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw AppError.validation({ file: ["Choose a file to upload"] });
  }
  if (file.size > env.UPLOAD_MAX_BYTES) throw tooLarge();

  const allowed = Object.keys(ALLOWED_UPLOAD_TYPES).join(", ");
  if (!isAllowedType(file.type)) {
    throw AppError.validation({ file: [`Unsupported file type. Allowed: ${allowed}`] });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesMagicBytes(file.type, bytes)) {
    throw AppError.validation({ file: ["File content does not match its type"] });
  }

  const key = newUploadKey(file.type);
  await storage.put(key, bytes, file.type);
  logger.info("file uploaded", { key, userId: user.id, size: file.size, driver: storage.name });

  return created({ key, url: storage.getUrl(key), contentType: file.type, size: file.size });
});
