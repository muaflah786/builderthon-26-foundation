export interface StorageDriver {
  readonly name: "local" | "s3";
  /** Stores bytes under `key` (overwrites). */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** URL a browser can load the object from. */
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
}
