import { sql } from "drizzle-orm";
import { ok } from "@/lib/api/server";
import { db } from "@/server/db";

/** GET /api/health — liveness + database connectivity. Used by deploy checks. */
export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    await db.run(sql`select 1`);
  } catch (error) {
    console.error("[health] database check failed:", error);
    database = "error";
  }
  return ok(
    { status: database === "ok" ? "ok" : "degraded", database, time: new Date().toISOString() },
    { status: database === "ok" ? 200 : 503 },
  );
}
