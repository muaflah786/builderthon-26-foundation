import { resetTestDb, setupTestDb } from "@tests/helpers/db";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { suggestSetup } from "@/lib/ops/scenarios/engine";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { opsTasks } from "@/server/db/schema/ops";
import {
  actOnIssue,
  actOnTask,
  getCommandView,
  getFieldView,
  getShareInfo,
  joinOperation,
  launchOperation,
  reportIssue,
} from "@/server/services/ops";
import {
  closeOperation,
  csvCell,
  exportCsv,
  getClosePreview,
  getSummary,
} from "@/server/services/ops-closure";
import type { SessionUser } from "@/types/auth";

async function makeUser(name: string, role: "user" | "admin" = "user"): Promise<SessionUser> {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: `${id}@example.com`, role });
  return { id, name, email: `${id}@example.com`, role, image: null };
}

/** Organizer + one member in the first team, with known activity. */
async function scenario() {
  const org = await makeUser("Olu");
  const vol = await makeUser("Vee");
  const s = suggestSetup({ situation: "Flood in 2 wards, 10 responders." });
  const id = await launchOperation(org, s.draft);
  const { joinToken } = await getShareInfo(org, id);
  const teamId = (await getCommandView(org, id)).teams[0].id;
  await joinOperation(vol, { token: joinToken, displayName: "Vee", teamId });
  const field = await getFieldView(vol, id);
  const [a, b] = field.availableTasks;
  await actOnTask(vol, id, a.id, { action: "start" });
  await actOnTask(vol, id, a.id, { action: "complete" });
  await actOnTask(vol, id, b.id, { action: "start" });
  const urgent = await reportIssue(vol, id, { title: "Family on a roof", severity: "urgent" });
  await reportIssue(vol, id, { title: '=HYPERLINK("x")', severity: "normal" });
  await actOnIssue(org, id, urgent.id, { action: "resolve", note: "Boat sent" });
  const total = (await db.select().from(opsTasks).where(eq(opsTasks.operationId, id))).length;
  return { org, vol, id, joinToken, total };
}

beforeAll(() => setupTestDb());
beforeEach(() => resetTestDb());

describe("operation closure", () => {
  it("summarises exactly what was recorded", async () => {
    const { org, id, total } = await scenario();
    const s = await getSummary(org, id);
    expect(s.people).toBe(2);
    expect(s.tasks.total).toBe(total);
    expect(s.tasks.done).toBe(1);
    expect(s.tasks.unfinished).toBe(total - 1);
    expect(s.tasks.completion).toBe(Math.round((1 / total) * 100));
    expect(s.issues).toMatchObject({ total: 2, urgent: 1, resolved: 1 });
    expect(s.issues.unresolved).toHaveLength(1);
    expect(s.issues.medianResolveMinutes).toBe(0);
    expect(s.timeline.map((t) => t.action)).toContain("launched");
  });

  it("only the organizer can close or export; members cannot read the summary", async () => {
    const { vol, id } = await scenario();
    await expect(getClosePreview(vol, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(closeOperation(vol, id, { unfinished: "leave" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(exportCsv(vol, id, "tasks")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getSummary(vol, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const admin = await makeUser("Ada", "admin");
    await expect(getSummary(admin, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("closing makes the operation read-only and stops joining, without deleting records", async () => {
    const { org, vol, id, joinToken, total } = await scenario();
    const preview = await getClosePreview(org, id);
    expect(preview.openTasks).toBe(total - 1);
    expect(preview.openIssues).toBe(1);

    await closeOperation(org, id, { unfinished: "leave" });
    await expect(closeOperation(org, id, { unfinished: "leave" })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    const task = (await getFieldView(vol, id)).activeTasks[0];
    await expect(actOnTask(vol, id, task.id, { action: "complete" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(reportIssue(vol, id, { title: "late", severity: "normal" })).rejects.toMatchObject(
      { code: "CONFLICT" },
    );
    const late = await makeUser("Late");
    await expect(
      joinOperation(late, { token: joinToken, displayName: "Late" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const s = await getSummary(org, id);
    expect(s.operation.status).toBe("closed");
    expect(s.operation.closedAt).toBeInstanceOf(Date);
    expect(s.tasks.total).toBe(total);
    expect(s.timeline.at(-1)?.action).toBe("closed");
  });

  it("can mark unfinished tasks cancelled on close", async () => {
    const { org, id, total } = await scenario();
    await closeOperation(org, id, { unfinished: "cancel" });
    const s = await getSummary(org, id);
    expect(s.tasks).toMatchObject({
      total: 1,
      done: 1,
      unfinished: 0,
      cancelled: total - 1,
      completion: 100,
    });
  });

  it("exports CSV with formulas neutralised", async () => {
    const { org, id, total } = await scenario();
    const tasks = await exportCsv(org, id, "tasks");
    expect(tasks.filename).toMatch(/-tasks\.csv$/);
    expect(tasks.csv.trim().split("\r\n")).toHaveLength(total + 1);
    const issues = await exportCsv(org, id, "issues");
    expect(issues.csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(issues.csv).not.toContain("@example.com");
  });

  it("csvCell quotes and escapes", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell(null)).toBe("");
  });
});
