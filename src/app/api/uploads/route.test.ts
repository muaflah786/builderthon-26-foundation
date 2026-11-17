import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/uploads/[key]/route";
import { POST } from "@/app/api/uploads/route";
import { resetRateLimits } from "@/server/security/rate-limit";
import { makeUser, mockSession } from "@tests/helpers/auth";
import { callRoute } from "@tests/helpers/request";

const root = vi.hoisted(() => ({ dir: "" }));

vi.mock(
  "@/server/auth/session",
  async () => (await import("@tests/helpers/auth")).sessionModuleMock,
);
// Uploads enabled with the local driver writing to a temp dir.
vi.mock("@/server/storage", async () => {
  const { createLocalStorage } = await import("@/server/storage/local");
  root.dir = mkdtempSync(path.join(tmpdir(), "bt-upload-route-"));
  const storage = createLocalStorage(root.dir);
  return { getStorage: () => storage, getLocalStorage: () => storage };
});

afterAll(() => rmSync(root.dir, { recursive: true, force: true }));
beforeEach(() => {
  resetRateLimits();
  mockSession(makeUser());
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function upload(file: File) {
  const form = new FormData();
  form.set("file", file);
  return callRoute(
    POST,
    new Request("http://localhost/api/uploads", { method: "POST", body: form }),
  );
}

describe("POST /api/uploads", () => {
  it("401 when signed out", async () => {
    mockSession(null);
    expect((await upload(new File([PNG], "a.png", { type: "image/png" }))).status).toBe(401);
  });

  it("201 stores a valid PNG and GET serves it with safe headers", async () => {
    const res = await upload(new File([PNG], "photo.png", { type: "image/png" }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ contentType: "image/png", size: PNG.length });
    const { key, url } = res.body.data;
    expect(url).toBe(`/api/uploads/${key}`);

    const served = await GET(new Request(`http://localhost${url}`), {
      params: Promise.resolve({ key }),
    });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(PNG);
  });

  it("422 for a disallowed type", async () => {
    const res = await upload(new File(["MZ"], "app.exe", { type: "application/x-msdownload" }));
    expect(res.status).toBe(422);
    expect(res.body.error.fieldErrors.file[0]).toMatch(/Unsupported file type/);
  });

  it("422 when content does not match the declared type", async () => {
    const res = await upload(
      new File(["<script>alert(1)</script>"], "x.png", { type: "image/png" }),
    );
    expect(res.status).toBe(422);
  });

  it("413 when the file exceeds UPLOAD_MAX_BYTES", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(PNG);
    const res = await upload(new File([big], "big.png", { type: "image/png" }));
    expect(res.status).toBe(413);
  });

  it("GET 404 for unknown or malformed keys", async () => {
    for (const key of ["../.env.local", "00000000-0000-0000-0000-000000000000.png"]) {
      const res = await GET(new Request("http://localhost/x"), {
        params: Promise.resolve({ key }),
      });
      expect(res.status).toBe(404);
    }
  });
});
