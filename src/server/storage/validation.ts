/**
 * Upload rules: MIME allow-list, magic-byte check (the browser-supplied type is
 * not trusted), and server-generated keys (no user-controlled paths).
 * SVG is deliberately NOT allowed (it can carry scripts).
 */

export const ALLOWED_UPLOAD_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
} as const;

export type AllowedUploadType = keyof typeof ALLOWED_UPLOAD_TYPES;

/** `<uuid>.<ext>` — the only key shape we ever create or serve. */
export const UPLOAD_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif|pdf)$/;

export function isAllowedType(type: string): type is AllowedUploadType {
  return Object.hasOwn(ALLOWED_UPLOAD_TYPES, type);
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b);

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

/** True when the file's first bytes match the declared type. */
export function matchesMagicBytes(type: AllowedUploadType, bytes: Uint8Array): boolean {
  switch (type) {
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/gif":
      return startsWith(bytes, ascii("GIF87a")) || startsWith(bytes, ascii("GIF89a"));
    case "image/webp":
      return startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8);
    case "application/pdf":
      return startsWith(bytes, ascii("%PDF-"));
  }
}

export function newUploadKey(type: AllowedUploadType): string {
  return `${crypto.randomUUID()}.${ALLOWED_UPLOAD_TYPES[type]}`;
}

export function contentTypeForKey(key: string): AllowedUploadType | null {
  const ext = key.split(".").pop();
  const entry = Object.entries(ALLOWED_UPLOAD_TYPES).find(([, e]) => e === ext);
  return entry ? (entry[0] as AllowedUploadType) : null;
}
