import { createHash, createHmac } from "node:crypto";
import type { StorageDriver } from "@/server/storage/types";

/**
 * Dependency-free S3-compatible driver (AWS S3, Cloudflare R2, MinIO, ...) using
 * AWS Signature Version 4 with path-style URLs: `${endpoint}/${bucket}/${key}`.
 * The signer is verified against AWS's published SigV4 example (s3.test.ts).
 * Uploading to a real bucket is UNTESTED here (no credentials available).
 */

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

const sha256Hex = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) =>
  createHmac("sha256", key).update(data).digest();

/** RFC 3986 encoding for one path segment, as SigV4 requires. */
const encodeSegment = (s: string) =>
  encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export type SignInput = {
  method: string;
  url: URL;
  /** Headers to sign (lower-case names). Must include host and x-amz-*. */
  headers: Record<string, string>;
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service?: string;
  /** YYYYMMDD'T'HHMMSS'Z' */
  amzDate: string;
};

/** Returns the `Authorization` header value for a SigV4-signed request. */
export function signV4({
  method,
  url,
  headers,
  payloadHash,
  accessKeyId,
  secretAccessKey,
  region,
  service = "s3",
  amzDate,
}: SignInput): string {
  const date = amzDate.slice(0, 8);
  const names = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const canonicalHeaders = names.map((n) => `${n}:${lower[n].trim()}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalQuery = Array.from(url.searchParams.entries())
    .map(([k, v]) => `${encodeSegment(k)}=${encodeSegment(v)}`)
    .sort()
    .join("&");

  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${secretAccessKey}`, date);
  const kSigning = hmac(hmac(hmac(kDate, region), service), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

const amzNow = () =>
  new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

export function createS3Storage(config: S3Config): StorageDriver {
  const objectUrl = (key: string) =>
    new URL(
      `${config.endpoint.replace(/\/$/, "")}/${encodeSegment(config.bucket)}/${key.split("/").map(encodeSegment).join("/")}`,
    );

  async function send(
    method: "PUT" | "DELETE",
    key: string,
    body?: Uint8Array,
    contentType?: string,
  ) {
    const url = objectUrl(key);
    const payloadHash = sha256Hex(body ?? new Uint8Array());
    const amzDate = amzNow();
    const signed: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(contentType ? { "content-type": contentType } : {}),
    };
    const authorization = signV4({
      method,
      url,
      headers: signed,
      payloadHash,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      amzDate,
    });
    const { host: _host, ...sendHeaders } = signed;
    void _host;
    const res = await fetch(url, {
      method,
      headers: { ...sendHeaders, authorization },
      body: body ? Buffer.from(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok && !(method === "DELETE" && res.status === 404)) {
      throw new Error(
        `S3 ${method} failed: HTTP ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  }

  return {
    name: "s3",
    put: (key, bytes, contentType) => send("PUT", key, bytes, contentType),
    delete: (key) => send("DELETE", key),
    getUrl: (key) => `${config.publicUrl.replace(/\/$/, "")}/${key}`,
  };
}
