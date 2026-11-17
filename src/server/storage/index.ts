import "server-only";

import { env } from "@/lib/env";
import { createLocalStorage } from "@/server/storage/local";
import { createS3Storage } from "@/server/storage/s3";
import type { StorageDriver } from "@/server/storage/types";

/**
 * Optional uploads module. Returns null when STORAGE_DRIVER is unset (feature off).
 * env.ts already guarantees the S3_* variables exist when STORAGE_DRIVER=s3.
 */

let cached: StorageDriver | null | undefined;
let localDriver: ReturnType<typeof createLocalStorage> | undefined;

export function getStorage(): StorageDriver | null {
  if (cached !== undefined) return cached;
  switch (env.STORAGE_DRIVER) {
    case undefined:
      cached = null;
      break;
    case "local":
      if (env.NODE_ENV === "production") {
        throw new Error("STORAGE_DRIVER=local is for development only; use s3 in production.");
      }
      cached = localDriver = createLocalStorage();
      break;
    case "s3":
      cached = createS3Storage({
        endpoint: env.S3_ENDPOINT!,
        region: env.S3_REGION,
        bucket: env.S3_BUCKET!,
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
        publicUrl: env.S3_PUBLIC_URL!,
      });
      break;
  }
  return cached;
}

/** The local driver (for serving files), or null when another driver is active. */
export function getLocalStorage() {
  getStorage();
  return localDriver ?? null;
}

export type { StorageDriver } from "@/server/storage/types";
